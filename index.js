const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();

// midleware
app.use(cors());
app.use(express.json());

// Verify Token
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}

// verify admin
const verifyAdmin = async (req, res, next) => {
  const requester = req.decoded.email;
  console.log(requester)
  const requesterAccount = await usersCollection.findOne({ email: requester });
  if (requesterAccount.role === 'admin') {
    next();
  }
  else {
    res.status(403).send({ message: 'forbidden access' });
  }
}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pdxgw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/* Dabase run function */
async function run() {
  try {
    await client.connect();
    console.log('DB Connected')
    // dabase name collection
    const productsCollection = client.db('gigitechbd').collection('products');
    const ordersCollection = client.db('gigitechbd').collection('orders');
    const usersCollection = client.db('gigitechbd').collection('users');
    const reviewsCollection = client.db('gigitechbd').collection('reviews');
    const paymentsCollection = client.db('gigitechbd').collection('payments');


    /*==== Start User Related APIs ====*/

    // user creation
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      // sign a token in user
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '48h' })
      res.send({ result, token })
    });
    // user profile update api
    app.put('/user/update/:email', async (req, res) => {
      const email = req.params.email;
      console.log(email)
      const user = req.body;
      console.log(user);
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(filter, updateDoc, options);
      res.send(result)
    })

    // Make admin user api
    app.put('/user/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    // check admin or not api
    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin });
    })

    // all users api
    app.get('/users', verifyJWT, async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    })

    /*==== End User Related APIs==== */


    /*==== Start Product Related APIs ====*/

    /* All prouct api */
    app.get('/products', async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    })

    // Add Product api
    app.post('/product/add', verifyJWT, async (req, res) => {
      const product = req.body;
      console.log(product)
      const result = await productsCollection.insertOne(product)
      res.send(result);
    })

    // Product Details api
    app.get('/product/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(query);
      res.send(product);
    })

    // After place order update availabe quantity update
    app.put('/product/:id', async (req, res) => {
      const productId = req.body.productId;
      const reduceQuantity = req.body.quantity;
      const query = { _id: ObjectId(productId) };
      const product = await productsCollection.findOne(query);
      const updateQuantity = await productsCollection.updateOne(
        { _id: ObjectId(productId) },
        {
          $set: {
            "availableQuantity": (parseInt(product.availableQuantity) - parseInt(reduceQuantity))
          }
        }
      );
      res.send(updateQuantity);
    })

    // Order API
    app.post('/order', async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    })


    // my orders api
    app.get('/myorders/:email', verifyJWT, async (req, res) => {
      const query = { email: req.params.email };
      const orders = await ordersCollection.find(query).toArray();
      return res.send(orders);
    })

    // Get single order information
    app.get('/order/:id', async (req, res,) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id.trim()) };
      const order = await ordersCollection.findOne(query);
      res.send(order);
    })

    // order payment update api
    app.patch('/order/:id', async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId
        }
      }
      const updatedOrder = await ordersCollection.updateOne(filter, updateDoc);
      const result = await paymentsCollection.insertOne(payment);
      res.send(updateDoc);
    })

    // order cancel api
    app.delete('/order/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(filter);
      res.send(result);
    })



    /*==== End Product Related APIs ====*/


    /*==== Start Reviews Related APIs ====*/
    // Add Review API
    app.post('/review/add', verifyJWT, async (req, res) => {
      const review = req.body;
      const result = await reviewsCollection.insertOne(review)
      res.send(result);
    })

    // Get Review API
    app.get('/reviews', async (req, res) => {
      const query = {};
      const cursor = reviewsCollection.find(query);
      const reviews = await cursor.toArray();
      res.send(reviews);
    })
    /*==== End Reviews Related APIs ====*/

    // Payment Intenet API
    app.post('/create-payment-intent', async (req, res) => {
      const order = req.body;
      const price = order.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'BDT',
        payment_method_types: ['card']
      });
      res.send({ clientSecret: paymentIntent.client_secret })
    });

  }
  finally {
    // db finally
  }
}
run();



// root route
app.get('/', (req, res) => {
  res.send('Gigitechbd server is running...')
});

app.listen(port, () => {
  console.log('Gigitech is running:', port)
});