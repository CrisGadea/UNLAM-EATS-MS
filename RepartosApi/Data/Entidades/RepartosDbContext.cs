using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore;

namespace RepartosApi.Data.Entidades;

public partial class RepartosDbContext : DbContext
{
    public RepartosDbContext()
    {
    }

    public RepartosDbContext(DbContextOptions<RepartosDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Reparto> Repartos { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {

    }


    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Reparto>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("PK__Repartos__3214EC073CDBF888");

            entity.Property(e => e.DireccionEntrega).HasMaxLength(255);
            entity.Property(e => e.Estado)
                .HasConversion<string>()  
                .HasMaxLength(50);
            entity.Property(e => e.FechaAsignacion)
                .HasDefaultValueSql("(getdate())")
                .HasColumnType("datetime");
            entity.Property(e => e.FechaEntrega).HasColumnType("datetime");
            entity.Property(e => e.Observaciones).HasMaxLength(255);
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
