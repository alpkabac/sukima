# -*- coding: utf-8 -*-

import torch
import torch.nn.functional as F
import torch.nn as nn
from torchvision.transforms import Normalize
import tqdm
import matplotlib.pyplot as plt
import kornia.augmentation as K
import clip
from PIL import Image
import io
import numpy as np
from datetime import datetime
import re
import os

path = './img'
if not os.path.exists(path):
  os.makedirs(path)

# Set image width and height
H = 32
W = 32
UPSCALE_SIZE = (H*1, W*1)

class MakeCutouts(nn.Module):
    """
    Cutout and augmentation
    Augmentation mostly based on mse regularized version of VQGANCLIP
    """
    def __init__(self, cut_size, repeat_n, crop_scale_min=0.5):
        super().__init__()
        self.cut_size = cut_size
        self.repeat_n = repeat_n
        self.augs = nn.Sequential(
            K.RandomResizedCrop((cut_size, cut_size), scale=(crop_scale_min, 1.0), ratio=(0.95, 1.05)),
            K.RandomHorizontalFlip(p=0.5),
            K.RandomAffine(degrees=30, translate=0.1, p=0.8, padding_mode='border'), # padding_mode=2
            K.RandomPerspective(0.2, p=0.4),
            K.ColorJitter(hue=0.01, saturation=0.01, p=0.7),
            Normalize((0.48145466, 0.4578275, 0.40821073), (0.26862954, 0.26130258, 0.27577711))
        )
        
    def forward(self, input):
        # N, C, H, W
        # repeat along batch
        rep_im = input.expand(self.repeat_n, -1, -1, -1)
        # rep_im = input.repeat(self.repeat_n, 1, 1, 1)
        aug_im = self.augs(rep_im)
        return aug_im

# Load CLIP model
clip_model, _pil_transform = clip.load('ViT-B/32', jit=False, device='cuda')
clip_model = clip_model.eval().requires_grad_(False)

def infer():
  # use sigmoid to force pixel values to be within 0~1 to make image
  image = torch.sigmoid(pix)
  # upscale image
  up_image = F.interpolate(image, size=UPSCALE_SIZE, mode='nearest')
  # make cutouts
  im_cutouts = cutout(up_image)
  # encode with CLIP
  image_feats = F.normalize(clip_model.encode_image(im_cutouts).float(), dim=1)
  plt.imshow(image.permute(0, 2, 3, 1)[0].detach().cpu())

"""## Main Code"""

# make text embedding
n_cutouts = 8
query_texts = ['Naked Girl']
text_feats = F.normalize(clip_model.encode_text(clip.tokenize(query_texts).to('cuda')).float(), dim=1)

# cutout module
n_px = clip_model.visual.input_resolution
cutout = MakeCutouts(n_px, n_cutouts, crop_scale_min=0.75)

# initialize pixels
pix = torch.randn(1, 3, H, W).to('cuda').requires_grad_(True)
# optimize the pixels directly
optimizer = torch.optim.Adam([pix], lr=1e-1)
losses = []
iter_count = 0
is_generating = False

def reset(cutouts, texts):
  # make text embedding
  global n_cutouts
  n_cutouts = cutouts
  global query_texts
  query_texts = [texts]
  global text_feats
  text_feats = F.normalize(clip_model.encode_text(clip.tokenize(query_texts).to('cuda')).float(), dim=1)

  # cutout module
  global n_px
  n_px = clip_model.visual.input_resolution
  global cutout
  cutout = MakeCutouts(n_px, n_cutouts, crop_scale_min=0.75)

  # initialize pixels
  global pix
  pix = torch.randn(1, 3, H, W).to('cuda').requires_grad_(True)
  # optimize the pixels directly
  global optimizer
  optimizer = torch.optim.Adam([pix], lr=1e-1)
  global losses
  losses = []
  global iter_count
  iter_count = 0

def resetAndTrain(cutouts, iter, text):
  reset(cutouts, text)
  return train(iter)

def changePrompt(prompt):
  global query_texts
  query_texts = [prompt]
  global text_feats
  text_feats = F.normalize(clip_model.encode_text(clip.tokenize(query_texts).to('cuda')).float(), dim=1)
  global n_px
  n_px = clip_model.visual.input_resolution
  global cutout
  cutout = MakeCutouts(n_px, n_cutouts, crop_scale_min=0.75)

def tensor_to_image(tensor):
    tensor = tensor*255
    tensor = np.array(tensor, dtype=np.uint8)
    if np.ndim(tensor)>3:
        assert tensor.shape[0] == 1
        tensor = tensor[0]
    return Image.fromarray(tensor)

def sanitizeFilename(text_before):
  return re.sub(r'[\'" \*/\\]{1}', '_', text_before)

def train(N_ITER):
  global is_generating
  if is_generating:
      return "Error: already running"
  is_generating = True
  global iter_count
  with tqdm.tqdm(range(N_ITER)) as pbar: # progress bar
    for i in pbar:
      # use sigmoid to force pixel values to be within 0~1 to make image
      image = torch.sigmoid(pix)
      # upscale image
      up_image = F.interpolate(image, size=UPSCALE_SIZE, mode='nearest')
      # make cutouts
      im_cutouts = cutout(up_image)
      # encode with CLIP
      image_feats = F.normalize(clip_model.encode_image(im_cutouts).float(), dim=1)
      # calculate cosine similarity between text and image embedding
      cos_sim = torch.sum(text_feats.unsqueeze(0) * image_feats.unsqueeze(1), dim=-1)
      # loss is 0 (perfect match) ~ 2 bc cos_sim is 1 ~ -1
      loss = (1 - cos_sim).mean()
      pbar.set_postfix(dict(epoch=i, loss=loss.item()))
      losses.append(loss.item())
      optimizer.zero_grad()
      # backpropagate the gradient from the loss to pix
      loss.backward()
      # perform gradient descent wrt pix
      optimizer.step()
  iter_count = iter_count + N_ITER
  img = image.permute(0, 2, 3, 1)[0].detach().cpu()
  plt.imshow(img)
  img = tensor_to_image(img)
  file_object = io.BytesIO()
  img.save(file_object, 'PNG')
  timestamp = datetime.timestamp(datetime.now())
  filename = sanitizeFilename('image_'+str(timestamp)+'_'+query_texts[0][:100]+'_'+str(iter_count)+'_'+str(n_cutouts)+'.png')
  img.save('img/'+filename)
  file_object.seek(0)
  is_generating = False
  return send_file(file_object, mimetype='image/PNG')

"""Run the next cell OR the one after"""

from flask import *

is_running = False

app = Flask(__name__)

@app.route('/index')
def home():
  if not request.args['input']:
    return "Error"

  print(request.args['input'])

  result = resetAndTrain(int(request.args['cutouts']) if request.args['cutouts'] else 6, int(request.args['steps']) if request.args['steps'] else 600, request.args['input'])
  return result

@app.route('/continue')
def continueGeneration():
  if not request.args['steps']:
    return "Error"

  result = train(int(request.args['steps']) if request.args['steps'] else 600)
  return result

@app.route('/changeInput')
def changePrompt():
  if not request.args['steps']:
    return "Error"
  if not request.args['input']:
    return "Error"

  changePrompt(request.args['input'])

  result = train(int(request.args['steps']) if request.args['steps'] else 600)
  return result

@app.route('/updateCutouts')
def updateCutouts():
  if not request.args['cutouts']:
    return "Error"

  global n_cutouts
  n_cutouts = int(request.args['cutouts'])
  
  global n_px
  n_px = clip_model.visual.input_resolution
  global cutout
  cutout = MakeCutouts(n_px, n_cutouts, crop_scale_min=0.75)

  result = train(0)
  return result

app.run(host= '0.0.0.0')
