"""App configuration."""
from os import environ
import redis


class Config:
    """Set Flask configuration vars from .env file."""

    # General Config
    SECRET_KEY = "asd"
    FLASK_APP = environ.get("FLASK_APP")
    FLASK_ENV = environ.get("FLASK_ENV")

    # Flask-Session
    SESSION_TYPE = "filesystem"
    SESSION_REDIS = "redis://localhost:6379"

