// Services/MenuMemoryStore.cs
using System.Collections.Concurrent;
using System.Text.Json;
using WebFamily.Server.Models;

namespace WebFamily.Server.Services
{
    public static class MenuMemoryStore
    {
        private static readonly ConcurrentDictionary<string, MenuData> _menuStore = new();
        private static readonly object _initLock = new object();
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
                    var menuFiles = new[] { "books.json", "photos.json", "links.json", "movies.json", "videos.json", "musics.json" };

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
                                    Version = Guid.NewGuid().ToString()[..8],
                                    LastUpdated = DateTime.UtcNow,
                                    Items = items
                                };
                                _menuStore.TryAdd(menuId, menuData);

                                // Save in new format
                                SaveMenuToDisk(menuId, menuData);
                            }
                            else
                            {
                                // New format
                                var menuData = JsonSerializer.Deserialize<MenuData>(jsonContent);
                                if (menuData != null)
                                {
                                    _menuStore.TryAdd(menuId, menuData);
                                }
                            }
                        }
                        else
                        {
                            // Create empty menu if file doesn't exist
                            var emptyMenu = new MenuData
                            {
                                Version = Guid.NewGuid().ToString()[..8],
                                LastUpdated = DateTime.UtcNow,
                                Items = new List<MenuItem>()
                            };
                            _menuStore.TryAdd(menuId, emptyMenu);
                            SaveMenuToDisk(menuId, emptyMenu);
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
            menu.Version = Guid.NewGuid().ToString()[..8];
            menu.LastUpdated = DateTime.UtcNow;

            _menuStore.AddOrUpdate(menuId, menu, (key, oldValue) => menu);

            // Async disk write
            _ = Task.Run(() => SaveMenuToDisk(menuId, menu));
        }

        public static bool AddMenuItem(string menuId, MenuItem newItem)
        {
            if (!_menuStore.TryGetValue(menuId, out var menu))
                return false;

            // Assign new ID
            newItem.Id = menu.Items.Count > 0 ? menu.Items.Max(x => x.Id) + 1 : 1;

            menu.Items.Add(newItem);
            UpdateMenu(menuId, menu);
            return true;
        }

        public static bool RemoveMenuItem(string menuId, string itemId)
        {
            if (!_menuStore.TryGetValue(menuId, out var menu))
                return false;

            var itemToRemove = menu.Items.FirstOrDefault(x => x.Title == itemId);
            if (itemToRemove == null)
                return false;

            menu.Items.Remove(itemToRemove);
            UpdateMenu(menuId, menu);
            return true;
        }
        public static bool RenameMenuItem(string menuId, int itemId, string newTitle, string newParam = null)
        {
            if (!_menuStore.TryGetValue(menuId, out var menu))
                return false;

            var itemToRename = menu.Items.FirstOrDefault(x => x.Id == itemId);
            if (itemToRename == null)
                return false;

            // Update the properties
            itemToRename.Title = newTitle;

            // Only update param if a new value is provided
            if (newParam != null)
                itemToRename.Param = newParam;

            UpdateMenu(menuId, menu);
            return true;
        }
        public static Dictionary<string, MenuData> GetAllMenus()
        {
            return _menuStore.ToDictionary(kvp => kvp.Key, kvp => kvp.Value);
        }

        private static void SaveMenuToDisk(string menuId, MenuData menu)
        {
            try
            {

                if (menu.Items != null && menu.Items.Any())
                {
                    var sortedItems = menu.Items
                        .OrderBy(item => item.Title, StringComparer.OrdinalIgnoreCase)
                        .Select((item, index) => new MenuItem
                        {
                            Id = (index + 1) * 10, // Start at 10, increment by 10
                            Title = item.Title,
                            Param = item.Param
                        })
                        .ToList();

                    menu.Items = sortedItems;
                }


                var filePath = Path.Combine(_dataPath, $"{menuId}.json");
                var json = JsonSerializer.Serialize(menu, new JsonSerializerOptions
                {
                    WriteIndented = true,
                    PropertyNamingPolicy = JsonNamingPolicy.CamelCase
                });
                File.WriteAllText(filePath, json);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to persist menu {menuId}: {ex.Message}");
            }
        }
    }
}