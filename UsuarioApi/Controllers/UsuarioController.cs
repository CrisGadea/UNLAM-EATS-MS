using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Linq;
using UsuarioApi.Models; // Asegúrate de que esta ruta sea correcta

namespace UsuarioApi.Controllers
{
    [ApiController]
    // La ruta base para este controlador será /api/Usuarios
    [Route("api/[controller]")]
    public class UsuariosController : ControllerBase
    {
        // 🚨 Simulación de base de datos con una lista estática (solo para pruebas)
        private static List<Usuario> Usuarios = new List<Usuario>
        {
            new Usuario { Id = 1, NombreUsuario = "Juan Perez", Email = "juan@mail.com" , PasswordHash = "1"},
            new Usuario { Id = 2, NombreUsuario = "Maria Lopez", Email = "maria@mail.com" }
        };
        private static int nextId = Usuarios.Count > 0 ? Usuarios.Max(u => u.Id) + 1 : 1;

        // Constructor (Puedes inyectar servicios aquí)
        public UsuariosController()
        {
            // Inicialización o inyección de dependencias
        }

        // ------------------------------------------------------------------
        // GET (Leer)
        // Ruta: GET /api/Usuarios
        [HttpGet]
        public ActionResult<IEnumerable<Usuario>> GetUsuarios()
        {
            // En una aplicación real: return Ok(await _repository.GetAllUsuarios());
            return Ok(Usuarios);
        }

        // Ruta: GET /api/Usuarios/{id} (Ejemplo: /api/Usuarios/1)
        [HttpGet("{id}")]
        public ActionResult<Usuario> GetUsuario(int id)
        {
            // En una aplicación real: var usuario = await _repository.GetUsuarioById(id);
            var usuario = Usuarios.FirstOrDefault(u => u.Id == id);

            if (usuario == null)
            {
                return NotFound(); // Código 404
            }

            return Ok(usuario); // Código 200 OK
        }

        // ------------------------------------------------------------------
        // POST (Crear)
        // Ruta: POST /api/Usuarios
        [HttpPost]
        public ActionResult<Usuario> PostUsuario(Usuario usuario)
        {
            // Asignar ID (solo para la simulación)
            usuario.Id = nextId++;
            Usuarios.Add(usuario);

            // Código 201 Created: Indica que el recurso fue creado exitosamente
            return CreatedAtAction(nameof(GetUsuario), new { id = usuario.Id }, usuario);
        }

        // ------------------------------------------------------------------
        // PUT (Actualizar)
        // Ruta: PUT /api/Usuarios/{id} (Ejemplo: /api/Usuarios/1)
        [HttpPut("{id}")]
        public IActionResult PutUsuario(int id, Usuario usuario)
        {
            if (id != usuario.Id)
            {
                return BadRequest(); // Código 400
            }

            var existingUser = Usuarios.FirstOrDefault(u => u.Id == id);
            if (existingUser == null)
            {
                return NotFound(); // Código 404
            }

            // Actualizar propiedades (simulación)
            existingUser.NombreUsuario = usuario.NombreUsuario;
            existingUser.Email = usuario.Email;

            // En una aplicación real: await _repository.UpdateUsuario(usuario);

            return NoContent(); // Código 204 No Content (Éxito sin retornar cuerpo)
        }

        // ------------------------------------------------------------------
        // DELETE (Eliminar)
        // Ruta: DELETE /api/Usuarios/{id} (Ejemplo: /api/Usuarios/1)
        [HttpDelete("{id}")]
        public IActionResult DeleteUsuario(int id)
        {
            var existingUser = Usuarios.FirstOrDefault(u => u.Id == id);
            if (existingUser == null)
            {
                return NotFound(); // Código 404
            }

            // Eliminar de la lista (simulación)
            Usuarios.Remove(existingUser);

            // En una aplicación real: await _repository.DeleteUsuario(id);

            return NoContent(); // Código 204 No Content
        }
    }
}
