import Logger from "@reactioncommerce/logger";
import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
import { Accounts, Cart, MediaRecords } from "/lib/collections";

Meteor.publish("Cart", function (shopId) {
  check(shopId, Match.Optional(String));

  if (!this.userId) {
    Logger.warn("Cart publication called without a user context. No cart will be published.");
    return this.ready();
  }

  const account = Accounts.findOne({ userId: this.userId }, { fields: { _id: 1 } });
  if (!account) {
    Logger.warn(`Cart publication called without an account for user with ID ${this.userId}. No cart will be published.`);
    return this.ready();
  }
  const accountId = account._id;

  // exclude these fields from the client cart
  const fields = {
    taxes: 0
  };

  const selector = { accountId };
  if (shopId) {
    selector.shopId = shopId;
  }

  return Cart.find(selector, { fields });
});

Meteor.publish("CartImages", (cartId) => {
  check(cartId, Match.Optional(String));
  if (!cartId) return [];

  const cart = Cart.findOne({ _id: cartId });
  const { items: cartItems } = cart || {};
  if (!Array.isArray(cartItems)) return [];

  // Ensure each of these are unique
  const productIds = [...new Set(cartItems.map((item) => item.productId))];
  const variantIds = [...new Set(cartItems.map((item) => item.variantId))];

  // return image for each the top level product or the variant and let the client code decide which to display
  return MediaRecords.find({
    "$or": [
      {
        "metadata.productId": {
          $in: productIds
        }
      },
      {
        "metadata.variantId": {
          $in: variantIds
        }
      }
    ],
    "metadata.workflow": {
      $nin: ["archived", "unpublished"]
    }
  });
});
