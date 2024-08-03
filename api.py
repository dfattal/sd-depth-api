from flask import Flask, request, jsonify
from diffusers import ControlNetModel, StableDiffusionControlNetPipeline
import torch


app = Flask(__name__)

# Load the model
controlnet = ControlNetModel.from_pretrained("diffusers/controlnet-depth-sdxl-1.0")
pipe = StableDiffusionControlNetPipeline.from_pretrained(
	"stabilityai/stable-diffusion-xl-base-1.0", controlnet=controlnet
)
pipe.to("cuda")


@app.route('/generate', methods=['POST'])
def generate_image():
    if 'depth_map' not in request.files:
        return jsonify({'error': 'No depth map provided'}), 400

    depth_map = request.files['depth_map']
    depth_map.save('input_depth_map.png')

    # Generate image
    prompt = "Generate image from depth map"
    result = pipe(prompt, depth_map="input_depth_map.png")
    generated_image = result.images[0]

    # Save generated image
    generated_image.save('output_image.png')

    return jsonify({'image_url': 'http://your-ec2-public-ip/output_image.png'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)