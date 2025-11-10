using System;
using System.Collections.Generic;

namespace ProductosApi.Models;

public partial class Producto
{
    public int Id { get; set; }

    public string Nombre { get; set; } = null!;

    public string? Descripcion { get; set; }

    public decimal Precio { get; set; }

    public int Stock { get; set; }

    public bool Disponible { get; set; }

    public int CategoriaId { get; set; }
    public virtual Categoria? Categoria { get; set; }
}
