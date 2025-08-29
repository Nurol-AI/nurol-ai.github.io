> **Copyright (c) 2025 Nurol, Inc. (nurol.ai)**  
> This file is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0).  
> For commercial use, please contact info@nurol.ai

# Nurol AI Helm Charts

This repository contains Helm charts for Nurol AI applications.

## Available Charts

- **nurops-event-manager**: Event Manager service for webhook management
  and event processing

## Usage

### Add the repository
```bash
helm repo add nurol-ai https://nurol-ai.github.io
helm repo update
```

### Install charts
```bash
# Install nurops-event-manager
helm install nurops-event-manager nurol-ai/nurops-event-manager

# Install with custom values
helm install nurops-event-manager nurol-ai/nurops-event-manager \
  -f custom-values.yaml
```

### List available charts
```bash
helm search repo nurol-ai
```

## Documentation

For detailed documentation, see the individual chart directories in the
[helm-charts repository](https://github.com/Nurol-AI/helm-charts).

## License

This repository and its contents are licensed under the Creative Commons
Attribution-NonCommercial 4.0 International License (CC BY-NC 4.0).

For commercial use, please contact info@nurol.ai
