.PHONY: help build up down logs clean restart

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Available targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

build: ## Build all Docker images
	docker-compose build

up: ## Start all services
	docker-compose up -d
	@echo ""
	@echo "🚀 Services started!"
	@echo "📝 Access the application at: http://localhost"
	@echo "📊 View logs with: make logs"

up-build: ## Build and start all services
	docker-compose up -d --build
	@echo ""
	@echo "🚀 Services started!"
	@echo "📝 Access the application at: http://localhost"

down: ## Stop all services
	docker-compose down

logs: ## View logs from all services
	docker-compose logs -f

logs-nginx: ## View nginx logs
	docker-compose logs -f nginx

logs-oauth: ## View OAuth2 Proxy logs
	docker-compose logs -f oauth2-proxy

logs-app: ## View demo app logs
	docker-compose logs -f demo-app

ps: ## Show running containers
	docker-compose ps

restart: ## Restart all services
	docker-compose restart

clean: ## Stop services and remove volumes
	docker-compose down -v
	@echo "🧹 Cleaned up all containers and volumes"

setup-env: ## Create .env file from template
	@if [ ! -f .env ]; then \
		cp env.example .env; \
		echo "📝 Created .env file from template"; \
		echo "⚠️  Please edit .env and add your OAuth credentials"; \
	else \
		echo "⚠️  .env file already exists"; \
	fi

generate-secret: ## Generate a cookie secret for OAuth2 Proxy
	@python3 -c 'import os,base64; print("Generated cookie secret:"); print(base64.urlsafe_b64encode(os.urandom(32)).decode())'

health: ## Check health of demo app
	@curl -s http://localhost/health | python3 -m json.tool || echo "Service not available"

