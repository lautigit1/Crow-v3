import { useEffect, useState, useCallback } from "react";
import { CenteredSpinner, EmptyState, Button } from "@/shared/ui";
import { orderApi, ORDER_STATUS_COLOR, type Order, type OrderCreate } from "@/entities/order";
import { productApi, type Product } from "@/entities/product";
import { color, font, radius } from "@/shared/config/theme";

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------
function StatusBadge({ status }: { status: Order["status"] }) {
  const bg = ORDER_STATUS_COLOR[status] ?? "#6b728