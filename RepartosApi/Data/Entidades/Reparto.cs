using System;
using System.Collections.Generic;

namespace RepartosApi.Data.Entidades;

public partial class Reparto
{
    public int Id { get; set; }

    public int IdPedido { get; set; }

    public int IdRepartidor { get; set; }

    public string DireccionEntrega { get; set; } = null!;

    public EstadoReparto Estado { get; set; }

    public DateTime FechaAsignacion { get; set; }

    public DateTime? FechaEntrega { get; set; }

    public string? Observaciones { get; set; }
}
