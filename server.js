const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/eblood";
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connect error:", err));

// Models
const Donor = mongoose.model("Donor", new mongoose.Schema({
  name: String, age: Number, blood: String, contact: String
}));

const Request = mongoose.model("Request", new mongoose.Schema({
  name: String, blood: String, qty: Number, loc: String, contact: String,
  status: { type: String, default: "pending" }, createdAt: { type: Date, default: Date.now }
}));

const Inventory = mongoose.model("Inventory", new mongoose.Schema({
  data: { type: Object }
}));

// Ensure single inventory document
async function getInventory(){
  let doc = await Inventory.findOne();
  if(!doc){
    doc = new Inventory({ data: {
      "A+":5,"A-":2,"B+":4,"B-":2,"O+":8,"O-":3,"AB+":2,"AB-":1
    }});
    await doc.save();
  }
  return doc;
}

// Routes
app.get("/inventory", async (req,res) => {
  const inv = await getInventory();
  res.json(inv.data);
});

app.post("/inventory/add", async (req,res) => {
  const { group, qty=1 } = req.body;
  const inv = await getInventory();
  inv.data[group] = (inv.data[group]||0) + Number(qty);
  await inv.save();
  res.json({ group, qty: inv.data[group] });
});

app.post("/inventory/remove", async (req,res) => {
  const { group, qty=1 } = req.body;
  const inv = await getInventory();
  inv.data[group] = Math.max(0, (inv.data[group]||0) - Number(qty));
  await inv.save();
  res.json({ group, qty: inv.data[group] });
});

app.post("/donors", async (req,res) => {
  const d = new Donor(req.body || {});
  await d.save();
  const inv = await getInventory();
  inv.data[d.blood] = (inv.data[d.blood]||0) + 1; // donation adds 1 unit (demo)
  await inv.save();
  res.json(d);
});

app.get("/donors", async(req,res) => {
  const list = await Donor.find().sort({ _id:-1 });
  res.json(list);
});

app.delete("/donors/:id", async(req,res) => {
  await Donor.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

app.post("/requests", async(req,res) => {
  const r = new Request(req.body || {});
  const inv = await getInventory();
  const available = inv.data[r.blood] || 0;
  if(available >= Number(r.qty)){
    inv.data[r.blood] = available - Number(r.qty);
    r.status = "fulfilled";
    await inv.save();
  }
  await r.save();
  res.json({ request: r, message: r.status === "fulfilled" ? `Allocated ${r.qty} unit(s)` : `Not enough inventory. Available: ${available}` });
});

app.get("/requests", async(req,res) => {
  const list = await Request.find().sort({createdAt:-1});
  res.json(list);
});

app.get("/", (req,res) => res.send("eBlood backend running"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
