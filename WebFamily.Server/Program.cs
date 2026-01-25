using AngleSharp.Io;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;
using System.Security.Claims;
using System.Text;
using System.Text.Json.Serialization;
using WebFamily.Server;
using WebFamily.Server.Data;
using WebFamily.Server.Helpers;
using WebFamily.Server.Models;
using WebFamily.Server.Services;
var builder = WebApplication.CreateBuilder(args);

// Configure services
builder.Services.ConfigureDatabaseServices(builder.Configuration);
builder.Services.ConfigureDependencyInjectionServices();
builder.Services.ConfigureIdentityServices();
builder.Services.ConfigureAuthenticationServices(builder.Configuration);
builder.Services.ConfigureApiServices();
builder.Services.ConfigureCorsServices();
builder.Services.Configure<ApplicationSettings>(builder.Configuration.GetSection("ApplicationSettings"));
builder.Services.ConfigureReverseProxyServices(builder.Configuration);
var app = builder.Build();
MenuMemoryStore.Initialize(app.Services.GetRequiredService<ILogger<Program>>());
// Configure pipeline
app.ConfigureRequestPipeline(builder.Configuration);

// Initialize database
await app.InitializeDatabaseAsync();

app.Run();

// Extension methods for better organization
namespace WebFamily.Server
{
    public static class ServiceCollectionExtensions
    {
        public static IServiceCollection ConfigureDatabaseServices(this IServiceCollection services, IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("DefaultConnection");

            services.AddDbContext<Context>(options => options.UseSqlServer(connectionString));
            services.AddDbContext<WebFamilyDbContext>(options => options.UseSqlServer(connectionString));

            return services;
        }

        public static IServiceCollection ConfigureDependencyInjectionServices(this IServiceCollection services)
        {
            services.AddScoped<JWTService>();
            services.AddScoped<EmailService>();
            services.AddScoped<ContextSeedService>();
            services.AddScoped<ITodoServices, TodoServices>();
            services.AddScoped<IMediaServices, MediaServices>();
            services.AddScoped<IRpmServices, RpmServices>();
            services.AddScoped<ITubeServices, TubeServices>();
            services.AddScoped<IUpdateDataBaseServices, UpdateDataBaseServices>();
            services.AddScoped<IPlacesService, PlacesService>();
            services.AddScoped<ISeoService, SeoService>();
            return services;
        }

        public static IServiceCollection ConfigureIdentityServices(this IServiceCollection services)
        {
            services.AddIdentityCore<User>(options =>
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

            return services;
        }
        public static IServiceCollection ConfigureAuthenticationServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(configuration["JWT:Key"]!)),
                        ValidIssuer = configuration["JWT:Issuer"],
                        ValidateIssuer = true,
                        ValidateAudience = false,
                        ClockSkew = TimeSpan.Zero, // Reduce token expiration tolerance

                        // Add these lines for .NET 9 compatibility
                        RoleClaimType = ClaimTypes.Role,
                        NameClaimType = ClaimTypes.NameIdentifier
                    };
                });

            services.AddAuthorizationBuilder()
                .AddPolicy("AdminPolicy", policy =>
                    policy.RequireRole("Admin"));
            //services.AddAuthorization();
            return services;
        }
        public static IServiceCollection ConfigureApiServices(this IServiceCollection services)
        {
            services.AddControllers()
                .ConfigureJsonSerialization()
                .AddXmlSerializerFormatters();

            services.AddSignalR();
            services.AddSwaggerGen();
            services.AddOpenApi();
            services.AddHttpClient();
            //services.AddAutoMapper(AppDomain.CurrentDomain.GetAssemblies());
            services.AddAutoMapper(cfg => {
                cfg.AddMaps(AppDomain.CurrentDomain.GetAssemblies());
            });
            services.AddMemoryCache();
            return services;
        }

        public static IServiceCollection ConfigureCorsServices(this IServiceCollection services)
        {
            services.AddCors();
            return services;
        }

        public static IServiceCollection ConfigureReverseProxyServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddReverseProxy()
                .LoadFromConfig(configuration.GetSection("ReverseProxy"));

            services.ConfigureSwagger();
            return services;
        }

        private static IMvcBuilder ConfigureJsonSerialization(this IMvcBuilder builder)
        {
            return builder
                .AddNewtonsoftJson(options =>
                {
                    options.SerializerSettings.ReferenceLoopHandling = ReferenceLoopHandling.Ignore;
                    options.SerializerSettings.TypeNameHandling = TypeNameHandling.None;
                    options.SerializerSettings.Formatting = Formatting.Indented;
                    options.SerializerSettings.ContractResolver = new CamelCasePropertyNamesContractResolver();
                })
                .AddJsonOptions(options =>
                {
                    options.JsonSerializerOptions.PropertyNameCaseInsensitive = true;
                    options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
                });
        }
    }

    public static class WebApplicationExtensions
    {
        public static WebApplication ConfigureRequestPipeline(this WebApplication app, IConfiguration configuration)
        {
            app.ConfigureCors(configuration);
            app.ConfigureDevelopmentEnvironment();
            app.ConfigureHttpsAndSecurity();
            app.ConfigureStaticFiles(configuration);
            app.UseAuthentication();
            app.UseRouting();
            app.UseAuthorization();
            app.ConfigureRouting();

            return app;

        }

        private static void ConfigureCors(this WebApplication app, IConfiguration configuration)
        {
            var corsUrls = configuration.GetSection("CorsUrls:AllowedOrigins").Get<string[]>();
            if (corsUrls?.Length > 0)
            {
                app.UseCors(opt =>
                {
                    opt.WithOrigins(corsUrls)
                       .AllowAnyHeader()
                       .AllowAnyMethod()
                       .AllowCredentials();
                });
            }
        }

        private static void ConfigureDevelopmentEnvironment(this WebApplication app)
        {
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
        }

        private static void ConfigureHttpsAndSecurity(this WebApplication app)
        {
            app.UseHttpsRedirection();
        }
        private static void ConfigureStaticFiles(this WebApplication app, IConfiguration configuration)
        {
            // Serve Angular static files
            app.UseDefaultFiles();
            app.UseStaticFiles();

            // Configure media files serving
            var mediaDrive = configuration.GetValue<string>("ApplicationSettings:MediaDrive") ?? @"c:\medias";
            app.ConfigureMediaFiles(mediaDrive);
        }

        private static void ConfigureMediaFiles(this WebApplication app, string mediaDrive)
        {
            if (!Directory.Exists(mediaDrive))
            {
                var logger = app.Services.GetRequiredService<ILogger<Program>>();
                logger.LogWarning("MediaDrive path '{MediaDrive}' does not exist. Media file serving will be disabled.", mediaDrive);
                return;
            }

            var mimeProvider = CreateMimeProvider();
            var fileProvider = new PhysicalFileProvider(mediaDrive);

            // Primary media files access
            app.UseStaticFiles(new StaticFileOptions
            {
                FileProvider = fileProvider,
                RequestPath = "/medias",
                ContentTypeProvider = mimeProvider
            });
            app.UseStaticFiles(new StaticFileOptions
            {
                OnPrepareResponse = ctx =>
                {
                    if (ctx.File.Name.EndsWith(".json"))
                    {
                        // Cache for 1 hour
                        ctx.Context.Response.Headers.Append(
                            "Cache-Control", "public,max-age=3600");
                    }
                }
            });
            // Directory browser for media files
            app.UseDirectoryBrowser(new DirectoryBrowserOptions
            {
                FileProvider = fileProvider,
                RequestPath = "/medias"
            });

            // Alternative file server route
            app.UseFileServer(new FileServerOptions
            {
                FileProvider = fileProvider,
                RequestPath = "/media-files",
                EnableDirectoryBrowsing = true,
                StaticFileOptions = { ContentTypeProvider = mimeProvider }
            });
        }

        private static FileExtensionContentTypeProvider CreateMimeProvider()
        {
            var mimeProvider = new FileExtensionContentTypeProvider();
            mimeProvider.Mappings[".flac"] = "audio/flac";
            mimeProvider.Mappings[".flv"] = "video/x-flv";
            mimeProvider.Mappings[".mkv"] = "video/mp4";
            mimeProvider.Mappings[".mov"] = "video/mp4";
            mimeProvider.Mappings[".iso"] = "application/octet-stream";
            return mimeProvider;
        }

        private static void ConfigureRouting(this WebApplication app)
        {
            app.MapReverseProxy();
            app.MapControllers();

            // Fallback to Angular for non-media routes
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
        }

        public static async Task<WebApplication> InitializeDatabaseAsync(this WebApplication app)
        {
            using var scope = app.Services.CreateScope();
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

            try
            {
                var contextSeedService = scope.ServiceProvider.GetRequiredService<ContextSeedService>();
                await contextSeedService.InitializeContextAsync();
                logger.LogInformation("Database initialized successfully");
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to initialize and seed the database");

                // In production, you might want to handle this differently
                if (app.Environment.IsDevelopment())
                {
                    throw; // Re-throw in development for debugging
                }
            }

            return app;
        }
    }
}