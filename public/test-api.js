const userCode = `print("คำนวณอายุ")
x=int(input("in1::"))
print("ทดสอบ 222")
y=int(input("in2::"))
print("333")`;

// Browser equivalent of btoa for UTF-8
const btoa = (str) => Buffer.from(str, 'binary').toString('base64');
const encodeBase64 = (str) => btoa(unescape(encodeURIComponent(str)));

const base64Code = encodeBase64(userCode);
const code = `import base64
user_code = base64.b64decode(b"${base64Code}").decode('utf-8')
try:
    exec(user_code)
except EOFError:
    pass`;

console.log(code);

fetch('https://xtgzdpztzdbavnbmjk2f25vq7u0nsfrx.lambda-url.us-east-1.on.aws/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code, input: '10\n' })
}).then(res => res.json()).then(console.log);