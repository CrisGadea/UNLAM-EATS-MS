using Microsoft.AspNetCore.Mvc;
using RepartosApi.Data.DTOs;
using RepartosApi.Data.Entidades;
using RepartosApi.Services;

namespace RepartosApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class RepartoController : Controller
    {
        private readonly IRepartoService _repartoService;

        public RepartoController(IRepartoService repartoService)
        {
            _repartoService = repartoService;
        }


        [HttpGet]
        public IActionResult GetAll()
        {
            var repartos = _repartoService.ObtenerRepartos();
            return Ok(repartos);
        }


        [HttpGet("{id}")]
        public IActionResult GetById(int id)
        {
            var reparto = _repartoService.ObtenerRepartoPorId(id);
            if (reparto == null)
            {
                return NotFound();
            }
            return Ok(reparto);

        }


        [HttpPost]
        public IActionResult Create(Reparto reparto)
        {
            _repartoService.AgregarReparto(reparto);
            return CreatedAtAction(nameof(GetById), new { id = reparto.Id }, reparto);
        }

        [HttpPut("{id}")]
        public IActionResult Update(int id, Reparto reparto)
        {
            if (id != reparto.Id)
            {
                return BadRequest();
            }
            _repartoService.ActualizarReparto(reparto);
            return NoContent();
        }

        [HttpDelete("{id}")]
        public IActionResult Delete(int id)
        {
            _repartoService.EliminarReparto(id);
            return NoContent();

        }


        [HttpPost("asignar")]
        public async Task<IActionResult> AsignarRepartidor([FromBody] AsignarRepartidorRequest request)
        {
            var reparto = await (_repartoService as RepartoService)!.AsignarRepartidorAsync(request.IdReparto, request.IdRepartidor);
            if (reparto == null)
            {
                return BadRequest("Reparto o repartidor inválido");
            }
            return Ok(reparto);
        }
        
        [HttpOptions("{id}/estado")]
        public IActionResult Options()
        {
            Response.Headers.Add("Access-Control-Allow-Origin", "*");
            Response.Headers.Add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            Response.Headers.Add("Access-Control-Allow-Headers", "Content-Type");
            return Ok();
        }

        [HttpPut("{id}/estado")]
        public async Task<IActionResult> CambiarEstado(int id, [FromBody] CambiarEstadoDTO body)
        {
            if (!Enum.TryParse<EstadoReparto>(body.NuevoEstado, out var nuevoEstado))
            {
                return BadRequest("Estado no válido");
            }

            var reparto = await _repartoService.CambiarEstadoAsync(id, nuevoEstado);
            if (reparto == null)
                return NotFound("Reparto no encontrado");

            return Ok(reparto);
        }

    }
}