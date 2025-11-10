using System;
using System.Collections.Generic;

namespace UsuarioApi.Models;

public partial class Usuario
{
    public int Id { get; set; }

    public string NombreUsuario { get; set; } = null!;

    public string PasswordHash { get; set; } = null!;

    public string? Email { get; set; }

    public string? DireccionDeEnvio { get; set; }
}
