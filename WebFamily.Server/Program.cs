using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using WebFamily;
using WebFamily.Data;
using WebFamily.Helpers;
using WebFamily.Models;
using WebFamily.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddSignalR();
builder.Services.AddSwaggerGen();
builder.Services.AddOpenApi();
builder.Services.AddHttpClient();

builder.Services.AddDbContext<Context>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
});
builder.Services.AddDbContext<WebFamilyDbContext>(options =>
{
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection"));
});

// Dependency injection for services
builder.Services.AddScoped<JWTService>();
builder.Services.AddScoped<EmailService>();
builder.Services.AddScoped<ContextSeedService>();
builder.Services.AddScoped<ITodoServices, TodoServices>();
builder.Services.AddScoped<IMediaServices, MediaServices>();
builder.Services.AddScoped<IRpmServices, RpmServices>();
builder.Services.AddScoped<ITubeServices, TubeServices>();
builder.Services.AddScoped<IUpdateDataBaseServices, UpdateDataBaseServices>();

builder.Services.AddReverseProxy()
    .LoadFromConfig(builder.Configuration.GetSection("ReverseProxy"));
builder.Services.ConfigureSwagger();

// Identity configuration
builder.Services.AddIdentityCore<User>(options =>
{
    options.Password.RequiredLength = 6;
    options.Password.RequireDigit = false;
    options.Password.RequireLowercase = false;
    options.Password.RequireUppercase = false;
    options.Password.RequireNonAlphanumeric = false;
    options.SignIn.RequireConfirmedEmail = true;
})
    .AddRoles<IdentityRole>()
    .AddRoleManager<RoleManager<IdentityRole>>()
    .AddEntityFrameworkStores<Context>()
    .AddSignInManager<SignInManager<User>>()
    .AddUserManager<UserManager<User>>()
    .AddDefaultTokenProviders();

// Authentication with JWT
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(builder.Configuration["JWT:Key"])),
            ValidIssuer = builder.Configuration["JWT:Issuer"],
            ValidateIssuer = true,
            ValidateAudience = false
        };
    });

builder.Services.AddCors();

// Configure custom JSON serialization
builder.Services.AddControllers().AddNewtonsoftJson(options =>
{
    options.SerializerSettings.ReferenceLoopHandling = ReferenceLoopHandling.Ignore;
    options.SerializerSettings.TypeNameHandling = TypeNameHandling.None;
    options.SerializerSettings.Formatting = Formatting.Indented;
})
.AddXmlSerializerFormatters()
.AddJsonOptions(options =>
{
    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
})
.AddNewtonsoftJson(options => options.SerializerSettings.ContractResolver = new CamelCasePropertyNamesContractResolver());

builder.Services.AddAutoMapper(System.AppDomain.CurrentDomain.GetAssemblies());

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseRouting();

// Cors setup
var corsUrls = builder.Configuration.GetSection("CorsUrls:AllowedOrigins").Get<string[]>();
app.UseCors(opt =>
{
    opt.WithOrigins(corsUrls!)
       .AllowAnyHeader()
       .AllowAnyMethod()
       .AllowCredentials();
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("../openapi/v1.json", "version 1");
    });
}
else
{
    app.UseHsts();
}

app.UseHttpsRedirection();

// Authentication and Authorization middleware
app.UseAuthentication();
app.UseAuthorization();

// Serve Angular static files
app.UseDefaultFiles();
app.UseStaticFiles();

// Serve media files from /assets/medias
string mediaDrive = builder.Configuration.GetValue<string>("ApplicationSettings:MediaDrive") ?? @"d:\medias";
if (!Directory.Exists(mediaDrive))
    throw new DirectoryNotFoundException($"MediaDrive path '{mediaDrive}' does not exist.");

var mimeProvider = new FileExtensionContentTypeProvider();
mimeProvider.Mappings[".flac"] = "audio/flac";
mimeProvider.Mappings[".flv"] = "video/x-flv";
mimeProvider.Mappings[".mkv"] = "video/mp4";
mimeProvider.Mappings[".mov"] = "video/mp4";

// Existing static files access at /medias
var fileProvider = new PhysicalFileProvider(mediaDrive);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = fileProvider,
    RequestPath = "/medias",
    ContentTypeProvider = mimeProvider
});

// Optional directory browser at /medias
app.UseDirectoryBrowser(new DirectoryBrowserOptions
{
    FileProvider = fileProvider,
    RequestPath = "/medias"
});

// UseFileServer at new route /media-files (to test)
app.UseFileServer(new FileServerOptions
{
    FileProvider = fileProvider,
    RequestPath = "/media-files",
    EnableDirectoryBrowsing = true,
    StaticFileOptions =
    {
        ContentTypeProvider = mimeProvider
    }
});


// Reverse Proxy configuration
app.MapReverseProxy();

// Controllers and fallback to Angular
app.MapControllers();
//app.MapFallbackToFile("/index.html");
app.MapWhen(context =>
    !context.Request.Path.StartsWithSegments("/medias") &&
    !context.Request.Path.StartsWithSegments("/media-files"),
    builder =>
    {
        builder.UseEndpoints(endpoints =>
        {
            endpoints.MapFallbackToFile("/index.html");
        });
    });

// Seed database
using (var scope = app.Services.CreateScope())
{
    try
    {
        var contextSeedService = scope.ServiceProvider.GetRequiredService<ContextSeedService>();
        await contextSeedService.InitializeContextAsync();
    }
    catch (Exception ex)
    {
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Failed to initialize and seed the database");
    }
}

app.Run();
