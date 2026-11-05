import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { cartController } from '../engine/cartController';

export function CartIndicator() {
  const [state, setState] = useState(cartController.state);
  useEffect(() => cartController.subscribe(() => setState(cartController.state)), []);

  return (
    <Link to="/cart" className="cart-indicator" aria-label={`Cart, ${state.totalQuantity} items`}>
      <span className="cart-icon" aria-hidden="true">🛒</span>
      {state.totalQuantity > 0 && (
        <span className="cart-badge">{state.totalQuantity}</span>
      )}
    </Link>
  );
}
