const code = `import tkinter as tk 
m=tk.Tk() 
m.title ('Main window') 
button = tk. Button (m, text='Stop', width=25, command=lambda: m.destroy() ) 
button.pack () 
m.mainloop ()`;

const buttonRegex = /([a-zA-Z0-9_]+)\s*=\s*(?:tk\.\s*)?Button\s*\((.*?)\)/gs;
let match;
while ((match = buttonRegex.exec(code)) !== null) {
  console.log('Button:', match[1]);
  console.log('Params:', match[2]);
}

const directCommandRegex = /([a-zA-Z0-9_]+)\s*=\s*(?:tk\.\s*)?Button\s*\(.*?command\s*=\s*(lambda\s*:.*?\(.*?\)|lambda\s*:.*?(?=[,)])|[a-zA-Z_][a-zA-Z0-9_]*).*?\)/gs;
directCommandRegex.lastIndex = 0;
while ((match = directCommandRegex.exec(code)) !== null) {
  console.log('Direct Command Button:', match[1]);
  console.log('Direct Command:', match[2]);
}
