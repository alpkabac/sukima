FROM python:3.9.6
ENV PYTHONUNBUFFERED 1

ENV PYTHONPATH "${PYTHONPATH}:/"
ENV PORT=8000

RUN mkdir /sukima
WORKDIR /sukima

COPY . /sukima
RUN pip install --upgrade pip
RUN pip install torch==1.10.2+cu113 torchvision==0.11.3+cu113 torchaudio==0.10.2+cu113 -f https://download.pytorch.org/whl/cu113/torch_stable.html
RUN pip install -r requirements.txt
