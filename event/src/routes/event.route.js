import { Router } from 'express';

import { logger } from '../utils/logger.utils.js';
import { createApiRoot } from '../client/create.client.js';

const eventRouter = Router();

eventRouter.post('/', async (req, res) => {

  const event = req.body;

  if (event.type === "OrderCreated") {
    const apiRoot = createApiRoot();

    let order = await apiRoot
    .orders()
    .withId({ID:event.resource.id})
    .get()
    .execute()
    .then(({ body }) => {
      return body;
    })
    .catch(console.error);

    let containsSub = false;
    let subscriptionIds = [];


    // **todo** grab the date here
    order.lineItems.forEach((lineItem) => {
      containsSub = (lineItem.productType.typeId.includes("subscription"));

      if (containsSub) {
        subscriptionIds.push(lineItem);
        containsSub = false;
      }
    });

    // // **todo** set the date for correct date
    // let result = await apiRoot
    //     .carts()
    //     .post({
    //       body: {
    //         currency: "USD",
    //         key: "9-15-23",
    //         lineItems: subscriptionIds
    //       }
    //     })
    //     .execute()
    //     .catch((e) => handleError(e));


    // **todo** set the date for correct date
    let result = await apiRoot
        .carts()
        .replicate()
        .post({
          body: {
            reference: {
              id: event.resource.id,
              typeId: 'order',
            },
          }
        })
        .execute();
    
    

    if (result) {

      let result2 = await apiRoot
      .carts()
      .withId({ID:result.body.id})
      .post({
        body: {
          version: result.body.version,
          actions: [
            {
              action: "setCustomType",
              type: {
                key: "subsc-det",
                typeId: "type"
              },
              fields: {
                is_active: true,
                next_recurrence: '2023-09-16',
                Subscription: true,
                subscription_sku: 'subs-30',
                original_order: {typeId: 'order',id: order.id}
              }
            }
          ]
        }
      })
      .execute();

      console.log(result2);
    }
  }

  logger.info('Event message received');
  res.status(200);
  res.send();
});

export default eventRouter;
