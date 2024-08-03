import torch
from fastapi import FastAPI, File, UploadFile
from fastapi.responses import FileResponse
from transformers import DPTFeatureExtractor, DPTForDepthEstimation
from diffusers import ControlNetModel, StableDiffusionXLControlNetPipeline, AutoencoderKL
from PIL import Image
import io

app = FastAPI()

vae = AutoencoderKL.from_pretrained("madebyollin/sdxl-vae-fp16-fix", torch_dtype=torch.float16)
controlnet = ControlNetModel.from_pretrained("lllyasviel/sd-controlnet-depth", torch_dtype=torch.float16)
pipe = StableDiffusionXLControlNetPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0",
    controlnet=controlnet,
    vae=vae,
    variant="fp16",
    use_safetensors=True,
    torch_dtype=torch.float16,
)
pipe.enable_model_cpu_offload()

@app.post("/generate-image/")
async def generate_image(file: UploadFile = File(...), prompt: str = "default prompt"):
    contents = await file.read()
    depth_image = Image.open(io.BytesIO(contents)).convert("RGB")
    controlnet_conditioning_scale = 0.5

    images = pipe(
        prompt, image=depth_image, num_inference_steps=30, controlnet_conditioning_scale=controlnet_conditioning_scale,
    ).images

    output_image = images[0]
    output_buffer = io.BytesIO()
    output_image.save(output_buffer, format="JPEG")
    output_buffer.seek(0)

    return FileResponse(output_buffer, media_type="image/jpeg")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)