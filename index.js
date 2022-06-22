const express = require('express'); 
const bodyParser = require("body-parser");
const cors = require('cors');
const axios = require('axios').default;
const schedule = require('node-schedule');
const app = express();              
const port = 5002;
const { Client } = require('@elastic/elasticsearch')
const config = require('config');
const elasticConfig = config.get('elastic');


app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const client = new Client({
    cloud: {
      id: elasticConfig.cloudID
    },
    auth: {
      username: elasticConfig.username,
      password: elasticConfig.password
    }
  });

const job = schedule.scheduleJob('*/1 * * * *', function(){
    getLogs("patel@etterno.io")
});

app.get('/', (req, res) => {   
    res.send('Hello World!').status(200);;                                                              
});

app.get('/api/getLogs', (req, res) => {
    const {query} = req;
    console.log(query)
    res.send(getLogs(query.id));
})

const getLogs = async(id) => {
    const response = await axios({
        method: 'get',
        url: 'https://sso.etterno.io/api/v1/users/'+id,
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': 'SSWS 00mCPWC4SmopQ-QVXwo9M8lITqLfUSMZ79d9QMvH4y'
        }
      })
        //   console.log(response.data);
    if(response.data == null){
        return response;
    }
    const userId = response.data.id;
    return(await fetchSystemLogs(userId));
}

const fetchSystemLogs = async (id) => {
    const res = await axios({
                    method: 'get',
                    url: 'https://sso.etterno.io/api/v1/logs?filter=actor.id eq "00u3g8x4qis2JH2x65d7"',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'Authorization': 'SSWS 00mCPWC4SmopQ-QVXwo9M8lITqLfUSMZ79d9QMvH4y'
                    }});
    addToElastic(res.data);
    return res.data; 
}

const addToElastic = async (logs) => {
    for (let i = 0; i < logs.length; i++) {
        console.log(logs[i].uuid)
        const id = logs[i].uuid;
        let flag = false;
        await client.indices.refresh({index: 'etterno-okta'})
        const res = await client.search({
            index: 'etterno-okta',
            body: {
              query: {
                match_all: { }
              }
            }
          })
          res.hits.hits.forEach(log =>{
              if(log._source.uuid === logs[i].uuid)
                flag=true
          })
        
          if(res != null && !flag) {
            await client.index({
                index: 'etterno-okta',
                body: logs[i]
            })
          }
        }
    }
app.listen(port, () => {            
    console.log(`Now listening on port ${port}`); 
});

