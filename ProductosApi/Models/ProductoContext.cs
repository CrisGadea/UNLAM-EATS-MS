using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace ProductosApi.Models;

public partial class ProductoContext : DbContext
{
    public ProductoContext()
    {
    }

    public ProductoContext(DbContextOptions<ProductoContext> options)
        : base(options)
    {
    }
        
    public virtual DbSet<Producto> Productos { get; set; }

    public virtual DbSet<Categoria> Categorias { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Producto>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Producto__3214EC07BB5C2B89");

            entity.Property(e => e.Descripcion).HasMaxLength(500);
            entity.Property(e => e.Disponible).HasDefaultValue(true);
            entity.Property(e => e.Nombre).HasMaxLength(100);
            entity.Property(e => e.Precio).HasColumnType("decimal(18, 2)");
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
