const express = require('express');
require('dotenv').config();
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();

// midleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pdxgw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

/* Dabase run function */
async function run() {
  try {
    await client.connect();
    console.log('DB Connected')
    // dabase name collection
    const productsCollection = client.db('gigitechbd').collection('products');

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