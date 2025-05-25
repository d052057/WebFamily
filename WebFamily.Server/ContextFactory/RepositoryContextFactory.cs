using WebFamily.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace WebFamily.ContextFactory
{
    public class RepositoryContextFactory : IDesignTimeDbContextFactory<Context>
    {
        public Context CreateDbContext(string[] args)
        {
            var configuration = new ConfigurationBuilder()
                .SetBasePath(Directory.GetCurrentDirectory())
                .AddJsonFile("appsettings.json")
                .Build();

            var builder = new DbContextOptionsBuilder<Context>()
                .UseSqlServer(configuration.GetConnectionString("sqlConnection"),
                b => b.MigrationsAssembly("WebFamily"));

            return new Context(builder.Options);
        }
    }
}
