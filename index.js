const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const cors = require('cors');
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

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pdxgw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/* Dabase run function */
async function run() {
  try {
    await client.connect();
    console.log('DB Connected')
    // dabase name collection
    const productsCollection = client.db('gigitechbd').collection('products');
    const ordersCollection = client.db('gigitechbd').collection('oders');
    const usersCollection = client.db('gigitechbd').collection('users');

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
      const token = jwt.sign({ email: email }, process.env.ACESS_TOKEN_SECRET, { expiresIn: '48h' })
      res.send({ result, token })
    })

    /* All prouct api */
    app.get('/products', async (req, res) => {
      const query = {};
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    })

    // Product Details api
    app.get('/product/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(query);
      res.send(product);
    })

    // Order API
    app.post('/order', async (req, res) => {
      const order = req.body;
      const result = await ordersCollection.insertOne(order);
      res.send(result);
    })

    // Get order api
    // app.get('/myorders/:email', verifyJWT, async (req, res) => {
    //   const query = { email: req.params.email };
    //   const decodedEmail = req.decoded.email;
    //   console.log(decodedEmail)
    //   if (query === decodedEmail) {
    //     const orders = await ordersCollection.find(query).toArray();
    //     return res.send(orders);
    //   }
    //   else {
    //     return res.status(403).send({ message: 'forbidden access' })
    //   }
    // })

    app.get('/myorders/:email', verifyJWT, async (req, res) => {
      const query = { email: req.params.email };
      const orders = await ordersCollection.find(query).toArray();
      return res.send(orders);
    })


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