//using System;
using System.ComponentModel;
//using System.Reflection;
public static class EnumMsg
{
    public enum EnumMessageUpdate
    {
        [Description("Videos metadata files have been updated!")]
        Videos,

        [Description("English Songs metadata files have been updated!")]
        EnglishSong,

        [Description("Documents metadata files have been updated!")]
        Books,

        [Description("Reasmey PeanMeas metadata files have been updated!")]
        Rpm,

        [Description("Album metadata files have been updated!")]
        Album,

        [Description("Movies metadata files have been updated!")]
        Movies,

        [Description("Photos metadata files have been updated!")]
        Photos,
        [Description("Text File metadata files have been updated!")]
        TextFiles,
    }
    public static string Get(string value)
    {
        bool success = System.Enum.TryParse(value, out EnumMessageUpdate EnumMessageUpdate);
        string Description;
        if (success)
        {
            switch (EnumMessageUpdate)
            {
                case EnumMessageUpdate.Album:
                    Description = GetDescription(EnumMessageUpdate.Album);
                    break;
                case EnumMessageUpdate.EnglishSong:
                    Description = GetDescription(EnumMessageUpdate.EnglishSong);
                    break;
                case EnumMessageUpdate.Books:
                    Description = GetDescription(EnumMessageUpdate.Books);
                    break;
                case EnumMessageUpdate.Videos:
                    Description = GetDescription(EnumMessageUpdate.Videos);
                    break;
                case EnumMessageUpdate.Photos:
                    Description = GetDescription(EnumMessageUpdate.Photos);
                    break;
                case EnumMessageUpdate.Rpm:
                    Description = GetDescription(EnumMessageUpdate.Rpm);
                    break;
                case EnumMessageUpdate.Movies:
                    Description = GetDescription(EnumMessageUpdate.Movies);
                    break;
                case EnumMessageUpdate.TextFiles:
                    Description = GetDescription(EnumMessageUpdate.TextFiles);
                    break;
                default:
                    Description = "Unknown Value :" + value;
                    break;
            }
        }
        else
        {
            Description = "Unknown Value :" + value;
        }
        return Description;
    }
    public static string GetDescription<T>(this T enumValue)
            where T : struct, IConvertible
    {
        if (!typeof(T).IsEnum)
            return String.Empty;

        var description = enumValue.ToString()!;
        var fieldInfo = enumValue.GetType().GetField(description);

        if (fieldInfo != null)
        {
            var attrs = fieldInfo.GetCustomAttributes(typeof(DescriptionAttribute), true);
            if (attrs != null && attrs.Length > 0)
            {
                description = ((DescriptionAttribute)attrs[0]).Description;
            }
        }

        return description;
    }
}
