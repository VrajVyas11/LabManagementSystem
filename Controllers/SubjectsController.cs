// Controllers/SubjectsController.cs
using LabManagementBackend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace LabManagementBackend.Controllers
{
    [ApiController]
    [Route("api/subjects")]
    [Authorize] // keep restricted to authenticated users; remove if you want public
    public class SubjectsController : ControllerBase
    {
        private readonly SubjectService _subjectService;

        public SubjectsController(SubjectService subjectService)
        {
            _subjectService = subjectService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var list = await _subjectService.GetAllAsync();
            return Ok(list);
        }
    }
}