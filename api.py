from flask import Flask, request, jsonify
from transformers import pipeline
import torch

app = Flask(__name__)

# Load the model
model = pipeline('image-to-image-depth', model='diffusers/controlnet-depth-sdxl-1.0')

@app.route('/generate', methods=['POST'])
def generate_image():
    if 'depth_map' not in request.files:
        return jsonify({'error': 'No depth map provided'}), 400

    depth_map = request.files['depth_map']
    depth_map.save('input_depth_map.png')

    # Generate image
    generated_image = model('input_depth_map.png')

    # Save generated image
    generated_image[0].save('output_image.png')

    return jsonify({'image_url': 'http://your-ec2-public-ip/output_image.png'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
