from pydantic import BaseModel


class DashboardStats(BaseModel):
    connected_accounts: int
    scheduled_posts: int
    posts_this_month: int
    failed_posts: int


class ActivityItem(BaseModel):
    message: str
    timestamp: str
    level: str  # "success" | "error"


class ChannelOverview(BaseModel):
    platform: str
    display_name: str
    status: str
    follower_count: int | None = None
