const express = require("express");
const nodemailer = require("nodemailer");
const bodyParser = require("body-parser");
const cron = require("node-cron");
const Pool = require('pg').Pool;
const pool = new Pool({
    user: "postgres",
    password: "root",
    host: "localhost",
    port: 5432,
    database: "express_send_email"
});

const PORT = 5000;
const app = express();

const [inQueue, sent, error] = ['в очереди', 'отправлено', 'ошибка при отправке'];

app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

app.get('/', (request, response) => {
    response.send('Hello');
});

// Отправка уведомления
app.post('/notification', async (request, response) => {
    const {title, text, recipient} = request.body;
    let {second, minute, hour, dayOfMonth, month, dayOfWeek} = request.query;
    let date = new Date();
    if (dayOfMonth === '*' && month === '*') {
        dayOfMonth = date.getDate();
        month = date.getDay();
    }
    let timeSend = `2021-${month}-${dayOfMonth} ${hour}:${minute}:${second}`;
    let newNotification = await pool.query(`INSERT INTO notification (title, text, recipient, status, time_send) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [title, text, recipient, inQueue, timeSend]);
    let transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'donnell.mcdermott71@ethereal.email', // generated ethereal user
            pass: 'EzuAYTSTMcQwhk7PkC', // generated ethereal password
        },
    });
    const msg = {
        from: '"Ivan Zaborskikh" <ivan@test.com>',
        to: `${recipient}`,
        subject: `${title}`,
        text: `${text}`
    };

    // num num num num num *    - для одноразовой отправки
    // num num num *  *  *    - для ежедневной отправки
    // num num num num num num  - настроиваемое, возможность задавать в какие дни и время отправить уведомление
    cron.schedule(`${second} ${minute} ${hour} ${dayOfMonth} ${month} ${dayOfWeek}`, async function () {
        let info = await transporter.sendMail(msg);
        newNotification = await pool.query(`UPDATE notification SET status = $1 WHERE time_send = $2`, [sent, timeSend]);
        console.log(`Message ${msg.subject} отправлено!`);
    });

    newNotification = await pool.query(`UPDATE notification SET status = $1 WHERE time_send < date_of_creation`, [error]);
    response.send(newNotification.rows[0]);
});

// Обновление уведомления
app.put('/notification', async (request, response) => {
    const {id, title, text} = request.body;
    if (await isTableContainsId(id)) {
        let date = new Date();
        const newDate = date.toLocaleDateString();
        const newTime = date.toLocaleTimeString();
        const updateDate = newDate + ' ' + newTime;
        const notification = await pool.query(`UPDATE notification set title = $1, text = $2, update_date = $3 WHERE id = $4 RETURNING *`, [title, text, updateDate, id]);
        response.send(notification.rows);
    } else {
        response.status(404).send(`Уведомление не найдено!`);
    }
});

// Удаление уведомления по Id
app.delete("/notification/:id", async (request, response) => {
    const id = request.params.id;
    if (await isTableContainsId(id)) {
        const notification = await pool.query(`DELETE FROM notification WHERE id = $1`, [id]);
        response.send(`Уведомление с id = ${id} удалено!`);
    } else {
        response.status(404).send(`Уведомление не найдено!`);
    }
});

// Массовое удаление уведомлений
app.delete("/notification", async (request, response) => {
    const notification = await pool.query(`DELETE FROM notification`);
    response.send(`Все уведомления удалены!`);
});

// Получить уведомление по id
app.get("/notification/:id", async (request, response) => {
    const id = request.params.id;
    if (await isTableContainsId(id)) {
        const notification = await pool.query(`SELECT * FROM notification WHERE id = $1`, [id]);
        response.send(notification.rows[0]);
    } else {
        response.status(404).send(`Пользователь не найден!`);
    }
});

app.get("/notification", async (request, response) => {
    if (request.query.title) {
        const title = request.query.title;
        const notification = await pool.query(`SELECT * FROM notification WHERE title = $1`, [title]);
        response.send(notification.rows);
    } else if (request.query.from && request.query.to) {
        const fromDate = request.query.from;
        const toDate = request.query.to;
        const notification = await pool.query(`SELECT * FROM notification WHERE update_date BETWEEN $1 AND $2`, [fromDate, toDate]);
        response.send(notification.rows);
    } else if (request.query.items_on_page) {
        const itemsOnPage = request.query.items_on_page;
        const notification = await pool.query(`SELECT * FROM notification LIMIT $1`, [itemsOnPage]);
        response.send(notification.rows);
    } else if (request.query.sort === 'title') {
        const notification = await pool.query(`SELECT * FROM notification ORDER BY title`);
        response.send(notification.rows)
    } else if (request.query.sort === 'date') {
        const notification = await pool.query(`SELECT * FROM notification ORDER BY time_send`);
        response.send(notification.rows)
    } else if (request.query.sort === 'stat_errors') {
        const notification = await pool.query(`SELECT * FROM notification WHERE status = $1`, [error]);
        response.send(notification.rows)
    } else {
        response.status(404).send(`Bad request`);
    }
});

async function isTableContainsId(id) {
    const arrayOfId = await pool.query(`SELECT id FROM notification`);
    const valuesId = arrayOfId.rows.map(item => item.id);
    return valuesId.includes(Number(id));
}

app.listen(PORT, () => console.log(`server on port ${PORT}`));









