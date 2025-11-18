using Microsoft.AspNetCore.Mvc;
using UsuarioApi.Models;

namespace UsuarioApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        // Simulación de base de datos con una lista estática
        private static List<Usuario> Usuarios = new List<Usuario>
        {
            new Usuario { Id = 1, NombreUsuario = "Juan Perez", Email = "juan@mail.com", PasswordHash = "1", Role = "cliente" },
            new Usuario { Id = 2, NombreUsuario = "Maria Lopez", Email = "maria@mail.com", PasswordHash = "1", Role = "dueno" }
        };
        private static int nextId = Usuarios.Count > 0 ? Usuarios.Max(u => u.Id) + 1 : 1;

        public class LoginRequest
        {
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
        }

        public class RegisterRequest
        {
            public string NombreUsuario { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Password { get; set; } = string.Empty;
            public string Role { get; set; } = "cliente"; // cliente, dueno, repartidor
        }

        public class LoginResponse
        {
            public string Token { get; set; } = string.Empty;
            public string Id { get; set; } = string.Empty;
            public string Email { get; set; } = string.Empty;
            public string Role { get; set; } = string.Empty;
        }

        // POST /api/auth/login
        [HttpPost("login")]
        public ActionResult<LoginResponse> Login([FromBody] LoginRequest request)
        {
            var usuario = Usuarios.FirstOrDefault(u => 
                u.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase) && 
                u.PasswordHash == request.Password);

            if (usuario == null)
            {
                return Unauthorized(new { message = "Email o contraseña incorrectos" });
            }

            // Token simulado (en producción usar JWT)
            var response = new LoginResponse
            {
                Token = $"fake-jwt-token-{usuario.Id}",
                Id = usuario.Id.ToString(),
                Email = usuario.Email,
                Role = usuario.Role ?? "cliente"
            };

            return Ok(response);
        }

        // POST /api/auth/register
        [HttpPost("register")]
        public ActionResult<object> Register([FromBody] RegisterRequest request)
        {
            // Validar que no exista el email
            if (Usuarios.Any(u => u.Email.Equals(request.Email, StringComparison.OrdinalIgnoreCase)))
            {
                return BadRequest(new { message = "El email ya está registrado" });
            }

            // Crear nuevo usuario
            var nuevoUsuario = new Usuario
            {
                Id = nextId++,
                NombreUsuario = request.NombreUsuario,
                Email = request.Email,
                PasswordHash = request.Password, // En producción: hashear la contraseña
                Role = request.Role
            };

            Usuarios.Add(nuevoUsuario);

            var response = new
            {
                id = nuevoUsuario.Id.ToString(),
                email = nuevoUsuario.Email,
                role = nuevoUsuario.Role
            };

            return CreatedAtAction(nameof(Login), response);
        }

        // GET /api/auth/me (verificar token)
        [HttpGet("me")]
        public ActionResult<object> GetCurrentUser([FromHeader(Name = "Authorization")] string? authHeader)
        {
            if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
            {
                return Unauthorized();
            }

            var token = authHeader.Replace("Bearer ", "");
            var parts = token.Split('-');
            
            if (parts.Length < 4 || !int.TryParse(parts[3], out int userId))
            {
                return Unauthorized();
            }

            var usuario = Usuarios.FirstOrDefault(u => u.Id == userId);
            if (usuario == null)
            {
                return Unauthorized();
            }

            return Ok(new
            {
                id = usuario.Id.ToString(),
                email = usuario.Email,
                nombreUsuario = usuario.NombreUsuario,
                role = usuario.Role
            });
        }
    }
}
