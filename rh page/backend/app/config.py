from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
    database_url: str = "sqlite:///./attendance.db"
    jwt_secret: str = "development-secret-change-me"
    company_latitude: float = 20.990472795438254
    company_longitude: float = -89.60574767428054
    allowed_radius_meters: float = 50
    initial_admin_email: str = "admin@example.com"
    initial_admin_password: str = "ChangeMe123!"
    employee_initial_password: str = "Bienvenida2026!"
    attendance_station_code: str = "recepcion"
    cors_origins: str = "http://localhost:5173"
    jwt_expiry_days: int = 30


settings = Settings()
