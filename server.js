const express = require('express');
const app = express();
const bodyParser = require('body-parser');
require('dotenv').config()
var mongoose = require('mongoose');
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());
const port = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// console.log that your server is up and running
app.listen(port, () => console.log(`Listening on port ${port}`));

// create a GET route
app.get('/express_backend', (req, res) => {
    res.send({ express: 'YOUR EXPRESS BACKEND IS CONNECTED TO REACT' });
});

const { Schema } = mongoose;
let userSchema = new Schema({
    username: String,
    sheets: [
        {
            id: String,
            data: [{
                entryKey: String,
                col: String,
                row: String,
                val: String,
                styleMap: [{
                    property: String,
                    value: String
                }]
            }]
        }
    ]
});
let User = mongoose.model('User', userSchema);

app.post('/api/users', (req, res) => {
    let user = User({
        username: req.body.username,
        sheets: []
    });
    let result = user.save((err, newUser) => {
        if (err) {
            console.log('Error: newUser(): save(): ' + err);
            res.json({ error: err });
        } else {
            User.findById(newUser._id, function (err, pers) {
                if (err) {
                    console.log('Error: newUser(): findById(): ' + err);
                    res.json({ error: err });
                } else res.json({ username: pers.username, _id: pers._id, sheets: pers.sheets});
            });
        }
    });
});
