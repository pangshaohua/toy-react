
// 真实dom标签的处理如div
class ElementWrapper {
  constructor(type) {
    this.root = document.createElement(type)
  }
  setAttribute(name,value) {
    this.root.setAttribute(name,value)
  }
  appendChild(component) {
    this.root.appendChild(component.root)
  }
}

// 文本节点的处理
class TextWrapper {
  constructor(content) {
    this.root = document.createTextNode(content)
  }
}
// 组件
export class Component {
  constructor() {
    this.props = Object.create(null)
    this.children = []
    this._root = null
  }
  setAttribute(name,value) {
    this.props[name] = value
  }
  appendChild(component) {
    this.children.push(component)
  }
  get root() {
    if (!this._root) {
      this._root = this.render().root
    }
    return this._root
  }
}


export function createElement(type,attributes,...children) {
  let e;
  if (typeof type === 'string') {
    // e = document.createElement(type);
    e = new ElementWrapper(type);
  } else {
    e = new type;
  }
  for (let p in attributes) {
    e.setAttribute(p,attributes[p]);
  }
  let insertChildren = (children) => {
    for (let child of children) {
      if (typeof child === 'string') {
        // child = document.createTextNode(child)
        child = new TextWrapper(child);
      }
      if ((typeof child === 'object') && (child instanceof Array)) {
        insertChildren(child)
      }else {
        e.appendChild(child);
      }
    }
  }
  insertChildren(children)
  return e;
}

export function render(component,parentElement) {
  parentElement.appendChild(component.root)
}