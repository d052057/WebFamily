// Services/MenuMemoryStore.cs
#nullable disable

using System.Collections.Concurrent;
using System.Text.Json;
using WebFamily.Server.Models;

namespace WebFamily.Server.Services
{
    /// <summary>
    /// In-memory copy of the JSON-backed menus (currently just links.json),
    /// persisted back to disk on every change.
    ///
    /// Every mutation builds a brand-new, normalized MenuData (items sorted by
    /// title, ids renumbered 10, 20, 30...), writes it to disk FIRST, and only
    /// then swaps it into memory. That gives two guarantees the admin screen
    /// relies on:
    ///   1. A failed disk write (e.g. the IIS app pool identity lacks write
    ///      permission on the Data folder) throws instead of being swallowed -
    ///      otherwise an edit looks successful, then silently vanishes on the
    ///      next app pool recycle.
    ///   2. A MenuData that readers can see is never mutated afterwards, so
    ///      GetMenuItems callers can enumerate it safely while another request
    ///      is saving, and ids are stable between a mutation and the
    ///      client's reload (previously ids were renumbered later, on a
    ///      background thread, which could shift them under the caller).
    /// </summary>
    public static class MenuMemoryStore
    {
        private static readonly ConcurrentDictionary<string, MenuData> _menuStore = new();
        private static readonly object _initLock = new object();
        // Serializes read-modify-write cycles across concurrent requests.
        private static readonly object _mutateLock = new object();
        private static bool _initialized = false;
        private static readonly string _dataPath = "Data";

        public static void Initialize(ILogger logger = null)
        {
            if (_initialized) return;

            lock (_initLock)
            {
                if (_initialized) return;

                try
                {
                    // Ensure data directory exists
                    if (!Directory.Exists(_dataPath))
                    {
                        Directory.CreateDirectory(_dataPath);
                    }

                    // Load all menu files
                    var menuFiles = new[] { "links.json" };

                    foreach (var fileName in menuFiles)
                    {
                        var filePath = Path.Combine(_dataPath, fileName);
                        var menuId = Path.GetFileNameWithoutExtension(fileName);

                        if (File.Exists(filePath))
                        {
                            var jsonContent = File.ReadAllText(filePath);

                            // Check if it's the old format (array) or new format (object)
                            if (jsonContent.TrimStart().StartsWith('['))
                            {
                                // Old format - convert to new format
                                var items = JsonSerializer.Deserialize<List<MenuItem>>(jsonContent) ?? new List<MenuItem>();
                                var menuData = new MenuData
                                {
                                    Version = NewVersion(),
                                    LastUpdated = DateTime.UtcNow,
                                    Items = Normalize(items)
                                };
                                _menuStore.TryAdd(menuId, menuData);

                                // Save in new format
                                TrySaveMenuToDisk(menuId, menuData);
                            }
                            else
                            {
                                // New format
                                var menuData = JsonSerializer.Deserialize<MenuData>(jsonContent);
                                if (menuData != null)
                                {
                                    // Hand-edited files can carry duplicate or
                                    // zero ids - renumber in memory so edit/
                                    // delete by id is always unambiguous. The
                                    // file itself is only rewritten on the next
                                    // real change.
                                    menuData.Items = Normalize(menuData.Items);
                                    _menuStore.TryAdd(menuId, menuData);
                                }
                            }
                        }
                        else
                        {
                            // Create empty menu if file doesn't exist
                            var emptyMenu = new MenuData
                            {
                                Version = NewVersion(),
                                LastUpdated = DateTime.UtcNow,
                                Items = new List<MenuItem>()
                            };
                            _menuStore.TryAdd(menuId, emptyMenu);
                            TrySaveMenuToDisk(menuId, emptyMenu);
                        }
                    }

                    _initialized = true;
                    logger?.LogInformation($"MenuMemoryStore initialized with {_menuStore.Count} menus");
                }
                catch (Exception ex)
                {
                    logger?.LogError(ex, "Failed to initialize MenuMemoryStore");
                    throw;
                }
            }
        }

        public static MenuData GetMenu(string menuId)
        {
            return _menuStore.TryGetValue(menuId, out var menu) ? menu : null;
        }

        public static List<MenuItem> GetMenuItems(string menuId)
        {
            return _menuStore.TryGetValue(menuId, out var menu) ? menu.Items : new List<MenuItem>();
        }

        public static string GetVersion(string menuId)
        {
            return _menuStore.TryGetValue(menuId, out var menu) ? menu.Version : null;
        }

        public static void UpdateMenu(string menuId, MenuData menu)
        {
            lock (_mutateLock)
            {
                Commit(menuId, menu.Items);
            }
        }

        /// <summary>
        /// Adds an item. Returns false if the menu doesn't exist. Throws if
        /// the change couldn't be saved to disk (nothing is changed in memory
        /// in that case).
        /// </summary>
        public static bool AddMenuItem(string menuId, MenuItem newItem)
        {
            lock (_mutateLock)
            {
                if (!_menuStore.TryGetValue(menuId, out var menu))
                    return false;

                var items = CloneItems(menu.Items);
                items.Add(new MenuItem { Title = newItem.Title, Param = newItem.Param });
                Commit(menuId, items);
                return true;
            }
        }

        /// <summary>
        /// Legacy: removes by Title. Prefer RemoveMenuItemById - ids are
        /// unique, titles only by convention.
        /// </summary>
        public static bool RemoveMenuItem(string menuId, string itemId)
        {
            lock (_mutateLock)
            {
                if (!_menuStore.TryGetValue(menuId, out var menu))
                    return false;

                var items = CloneItems(menu.Items);
                var itemToRemove = items.FirstOrDefault(x => x.Title == itemId);
                if (itemToRemove == null)
                    return false;

                items.Remove(itemToRemove);
                Commit(menuId, items);
                return true;
            }
        }

        public static bool RemoveMenuItemById(string menuId, int itemId)
        {
            lock (_mutateLock)
            {
                if (!_menuStore.TryGetValue(menuId, out var menu))
                    return false;

                var items = CloneItems(menu.Items);
                var itemToRemove = items.FirstOrDefault(x => x.Id == itemId);
                if (itemToRemove == null)
                    return false;

                items.Remove(itemToRemove);
                Commit(menuId, items);
                return true;
            }
        }

        /// <summary>
        /// Updates an item's title and (when provided) param, by id.
        /// </summary>
        public static bool UpdateMenuItem(string menuId, int itemId, string newTitle, string newParam = null)
        {
            lock (_mutateLock)
            {
                if (!_menuStore.TryGetValue(menuId, out var menu))
                    return false;

                var items = CloneItems(menu.Items);
                var itemToUpdate = items.FirstOrDefault(x => x.Id == itemId);
                if (itemToUpdate == null)
                    return false;

                itemToUpdate.Title = newTitle;

                // Only update param if a new value is provided
                if (newParam != null)
                    itemToUpdate.Param = newParam;

                Commit(menuId, items);
                return true;
            }
        }

        public static bool RenameMenuItem(string menuId, int itemId, string newTitle, string newParam = null)
            => UpdateMenuItem(menuId, itemId, newTitle, newParam);

        public static Dictionary<string, MenuData> GetAllMenus()
        {
            return _menuStore.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
        }

        // Builds the next normalized state, persists it, THEN publishes it.
        // Must be called inside _mutateLock.
        private static void Commit(string menuId, List<MenuItem> items)
        {
            var next = new MenuData
            {
                Version = NewVersion(),
                LastUpdated = DateTime.UtcNow,
                Items = Normalize(items)
            };

            WriteMenuToDisk(menuId, next); // throws on failure - memory untouched
            _menuStore[menuId] = next;
        }

        private static string NewVersion() => Guid.NewGuid().ToString()[..8];

        private static List<MenuItem> CloneItems(IEnumerable<MenuItem> items) =>
            items.Select(i => new MenuItem { Id = i.Id, Title = i.Title, Param = i.Param }).ToList();

        // Sorted by title, ids renumbered 10, 20, 30...
        private static List<MenuItem> Normalize(IEnumerable<MenuItem> items) =>
            (items ?? Enumerable.Empty<MenuItem>())
                .OrderBy(item => item.Title, StringComparer.OrdinalIgnoreCase)
                .Select((item, index) => new MenuItem
                {
                    Id = (index + 1) * 10,
                    Title = item.Title,
                    Param = item.Param
                })
                .ToList();

        private static void WriteMenuToDisk(string menuId, MenuData menu)
        {
            var filePath = Path.Combine(_dataPath, $"{menuId}.json");
            var json = JsonSerializer.Serialize(menu, new JsonSerializerOptions
            {
                WriteIndented = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });

            // Write to a temp file and swap it in, so a crash or full disk
            // mid-write can't leave a truncated links.json behind.
            var tempPath = filePath + ".tmp";
            File.WriteAllText(tempPath, json);
            File.Move(tempPath, filePath, overwrite: true);
        }

        // Startup-only variant: a menu file that can't be written yet
        // shouldn't stop the app from starting (reads still work from
        // memory) - same behaviour as before this class became strict.
        private static void TrySaveMenuToDisk(string menuId, MenuData menu)
        {
            try
            {
                WriteMenuToDisk(menuId, menu);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to persist menu {menuId}: {ex.Message}");
            }
        }
    }
}
