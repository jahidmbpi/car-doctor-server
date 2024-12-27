const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cokieparser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cokieparser());
require("dotenv").config();

const uri = `mongodb+srv://${process.env.CAR_USER}:${process.env.CAR_PASSWORD}@cluster0.g8zp6.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
//midelware
const logger = async (req, res, next) => {
  console.log(req.method, req.url);
  next();
};

const tockenVerify = async (req, res, next) => {
  const tocken = req.cookies?.tocken;
  if (!tocken) {
    return res.status(401).send({ message: "unathorised" });
  }
  jwt.verify(tocken, process.env.ACCESS_TOCKENT_SECRET, (error, decoded) => {
    if (error) {
      return res.status(401).send({ message: "unathorised" });
    }
    req.user = decoded;
    next();
  });
};

async function run() {
  try {
    const serviceCollection = client.db("carDoctor").collection("services");
    const bookingCollection = client.db("carDoctor").collection("bookings");
    const userCollection = client.db("carDoctor").collection("user");
    // user related api
    app.post("/user", async (req, res) => {
      const user = { ...req.body, role: "user" };
      console.log(user);
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.get("/user", logger, tockenVerify, async (req, res) => {
      try {
        if (!req.query.email) {
          return res.status(400).send({ message: "Email is required" });
        }
        let query = {};
        if (req.query.email) {
          query = { email: req.query.email };
        }
        const result = await userCollection.findOne(query);
        res.send(result);
      } catch (error) {
        console.log("data not found", error);
      }
    });

    app.get("/alluser", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    //  auth related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const tocken = jwt.sign(user, process.env.ACCESS_TOCKENT_SECRET, {
        expiresIn: "1h",
      });
      // console.log(tocken);
      res
        .cookie("tocken", tocken, {
          httpOnly: true,
          secure: true,
          sameSite: "none",
        })
        .send({ success: true });
    });

    app.post("/loggedin", async (req, res) => {
      const user = req.body;
      res.clearCookie("tocken", { maxAge: 0 }).send({ success: true });
    });

    // services api
    app.get("/services", async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };

      const options = {
        projection: { title: 1, img: 1, price: 1, description: 1 },
      };

      const result = await serviceCollection.findOne(query, options);
      res.send(result);
    });

    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      // console.log(booking);
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    app.get("/bookings", tockenVerify, logger, async (req, res) => {
      try {
        let query = {};
        if (req.query.email) {
          query = { userEmail: req.query.email };
        }
        // console.log(query);
        const result = await bookingCollection.find(query).toArray();
        // console.log({ result });
        res.send(result);
      } catch (error) {
        console.log("internal errr", error);
      }
    });

    app.get("/allbookings", async (req, res) => {
      const result = await bookingCollection.find({}).toArray();
      res.send(result);
    });

    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });
    app.patch("/bookings/:id", async (req, res) => {
      const confrimedBookings = req.body;
      // console.log(confrimedBookings);
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };

      const updateDoc = {
        $set: {
          status: confrimedBookings.status,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("car doctor server is running");
});

app.listen(port, () => {
  console.log(`car doctor is running on port${port}`);
});
