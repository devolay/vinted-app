from app.db.models.item import Item


def schedule_item_post(item: Item) -> Item:
    """Dummy scheduling hook for future Vinted integration."""
    item.status = "scheduled"
    return item


def mark_item_sold(item: Item) -> Item:
    """Dummy sold-state transition for inventory management."""
    item.status = "sold"
    return item
