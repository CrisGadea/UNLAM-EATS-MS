using Microsoft.EntityFrameworkCore;
using PedidosApi.Models;

namespace PedidosApi.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) {}

    public DbSet<Order> Orders => Set<Order>();
    public DbSet<OrderItem> OrderItems => Set<OrderItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Order>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.CustomerId).HasMaxLength(100).IsRequired();
            e.Property(x => x.Total).HasColumnType("decimal(12,2)");
            e.Property(x => x.CreatedAt).HasDefaultValueSql("GETUTCDATE()");
            e.HasMany(x => x.Items)
                .WithOne(x => x.Order!)
                .HasForeignKey(x => x.OrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OrderItem>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.NameSnapshot).HasMaxLength(200).IsRequired();
            e.Property(x => x.PriceSnapshot).HasColumnType("decimal(10,2)");
        });
    }
}
