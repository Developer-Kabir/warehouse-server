const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;


const app = express();

//middleware
app.use(cors());
app.use(express.json());


function verifyJWT(req, res, next){
    const authHeader = req.header.authorization;
    if (!authHeader) {
        return res.status(401).send({message: 'unauthorized access'})
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.TOKEN, (err, decoded) => {
        if (err) {
            return res.status(403).send({message: 'forbidden access'})
        }
        console.log('decoded', decoded);
        req.decoded = decoded;
        next();

    })
   
}


const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0-shard-00-00.hkeao.mongodb.net:27017,cluster0-shard-00-01.hkeao.mongodb.net:27017,cluster0-shard-00-02.hkeao.mongodb.net:27017/?ssl=true&replicaSet=atlas-7i6kd9-shard-0&authSource=admin&retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        await client.connect();
        const carCollection = client.db('warehouse').collection('car');
        const addCarCollection = client.db('warehouse').collection('addCar');
        
         //AUTH
         app.post('/login' , async(req, res) => {
            const user = req.body;
            const accessToken = jwt.sign(user, process.env.TOKEN, {
                expiresIn: '1d'
            });
            res.send({accessToken});
        })

        // get
        app.get('/car', async (req, res) => {
            const query = {};
            const cursor = carCollection.find(query);
            const cars = await cursor.toArray();
            res.send(cars);
        });



        app.get('/car/:id' , async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const item = await carCollection.findOne(query);
            res.send(item);
        });


        // post
        app.post('/car', async (req, res) => {
            const newItem = req.body;
            const result = await carCollection.insertOne(newItem);
            res.send(result)
        });

        app.post('/addItem', async(req, res) => {
            const newItem = req.body;
            const result = await addCarCollection.insertOne(newItem);
            res.send(result)
        });


        //DELETE
        app.delete('/car/:id', async(req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const cars = await carCollection.deleteOne(query);
            res.send(cars);
        })

        //myitem
        app.get('/myitem', verifyJWT, async(req, res) => {
            const decodedEmail = req.decoded.email;
            const email = req.query.email;
            console.log(email);
            console.log(decodedEmail);
            if (email === decodedEmail) {
            const query = {email: email};
            console.log(query);
            const cursor = carCollection.find(query);
            const myitems = await cursor.toArray() ;
            res.send(myitems);
            } 
        });

        //deliverd and stock
        app.put('/car/:id', async(req, res) => {
            const id = req.params.id;
            const updateQuantity = req.body;
            const filter = {_id: ObjectId(id)};
            const options = {upsert: true};
            const updateDoc = {
                $set:{
                    quantity: updateQuantity.quantity
                }
            }
            const result = await carCollection.updateOne(filter,updateDoc,options);
            res.send(result);
        })

    }
    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Warehouse server Running')
});

app.listen(port, () => {
    console.log('listening to port', port);
})