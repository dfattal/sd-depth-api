# process_image.py
import sys
import torch
from transformers import DPTFeatureExtractor, DPTForDepthEstimation
from diffusers import ControlNetModel, StableDiffusionXLControlNetPipeline, AutoencoderKL
from diffusers.utils import load_image
from PIL import Image
import io

# Load models
vae = AutoencoderKL.from_pretrained("madebyollin/sdxl-vae-fp16-fix", torch_dtype=torch.float16)
controlnet = ControlNetModel.from_pretrained("diffusers/controlnet-depth-sdxl-1.0", torch_dtype=torch.float16)
pipe = StableDiffusionXLControlNetPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0",
    controlnet=controlnet,
    vae=vae,
    variant="fp16",
    use_safetensors=True,
    torch_dtype=torch.float16,
)
pipe.enable_model_cpu_offload()

def process_image(depth_image_bytes):
    depth_image = Image.open(io.BytesIO(depth_image_bytes)).convert("RGB")
    controlnet_conditioning_scale = 0.5

    prompt = ""
    images = pipe(
        prompt, image=depth_image, num_inference_steps=30, controlnet_conditioning_scale=controlnet_conditioning_scale,
    ).images
    return images[0]

if __name__ == "__main__":
    depth_image_path = sys.argv[1]
    with open(depth_image_path, "rb") as f:
        depth_image_bytes = f.read()
    output_image = process_image(depth_image_bytes)
    output_image.save("output.jpg")