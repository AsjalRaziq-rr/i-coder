const app = document.getElementById('app');

app.innerHTML = `
  <h1>Simple Todo App</h1>
  <div>
    <input type="text" id="todoInput" placeholder="Enter a todo item..." />
    <button id="addBtn">Add Todo</button>
  </div>
  <ul id="todoList"></ul>
`;

let todos = [];

const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');

addBtn.addEventListener('click', () => {
  const text = todoInput.value.trim();
  if (text) {
    todos.push({ id: Date.now(), text: text });
    todoInput.value = '';
    renderTodos();
  }
});

todoInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    addBtn.click();
  }
});

function renderTodos() {
  todoList.innerHTML = '';
  todos.forEach((todo) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${todo.text}</span>
      <button onclick="deleteTodo(${todo.id})">Delete</button>
    `;
    todoList.appendChild(li);
  });
}

function deleteTodo(id) {
  todos = todos.filter((todo) => todo.id !== id);
  renderTodos();
}