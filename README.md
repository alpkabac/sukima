![logo](banner.png)

## Overview
Sukima is a ready-to-deploy container that implements a REST API for Language Models designed with the specific purpose of easy deployment and scalability.

### Curent API Functions
- **models** : Fetch a list of ready-to-use Language Models for inference.
- **load** : Allocate a Language Model.
- **delete** : Free a Language Model from memory.
- **generate** : Use a Language Model to generate tokens.
- **classify** : Use a Language Model to classify tokens and retrieve scores.

### Setup
[Setup Guide](../../wiki/Setup)

### Todo
- Autoscaling
- HTTPS Support
- Rate Limiting
- Support for other Language Modeling tasks such as Sentiment Analysis and Named Entity Recognition.

### License
[Simplified BSD License](LICENSE)
