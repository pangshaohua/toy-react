
const RENDER_TO_DOM = Symbol('render to dom')


// 组件
export class Component {
  constructor() {
    this.props = Object.create(null)
    this.children = []
    this._root = null
    this._range = null
  }
  setAttribute(name,value) {
    this.props[name] = value
  }
  appendChild(component) {
    this.children.push(component)
  }
  get vdom() {
    return this.render().vdom;
  }
  [RENDER_TO_DOM](range) {
    this._range = range
    this._vdom = this.vdom // this.vdom的返回值为this
    this._vdom[RENDER_TO_DOM](range) // 递归调用,this.vdom即为elementwrapper或textwrapper，递归调用每个wrapper的RENDER_TO_DOM
  }
  update() {
    let isSameNode = (oldNode,newNode) => {
      // 类型不同
      if (oldNode.type !== newNode.type)
        return false;

      // 属性不同
      for(let name in newNode.props) {
        if (newNode.props[name] !== oldNode.props[name]) {
          return false;
        }
      }

      // 属性的长度不同
      if(Object.keys(oldNode.props).length > Object.keys(newNode.props).length) 
        return false;

      // 如果类型是文本节点，判断内容是否相同
      if (newNode.type === '#text') {
        if (newNode.content !== oldNode.content) {
          return false;
        }
      }

      return true;
    }
    let update = (oldNode,newNode) => {
      // 对比根节点
      // type props children
      // type为text时 对比content

      if (!isSameNode(oldNode,newNode)) {
        // 不是相同节点直接重新渲染
        newNode[RENDER_TO_DOM](oldNode._range)
        return;
      }
      // 否则先把旧节点的range复制给新的range
      newNode._range = oldNode._range

      let newChildren = newNode.vchildren;
      let oldChildren = oldNode.vchildren;

      if (!newChildren || !newChildren.length){
        return;
      }

      // 对插入操作要先将最后一个range保存下来
      let tailRange = oldChildren[oldChildren.length - 1]._range

      // 比较新旧节点的差异，递归更新
      for(let i = 0; i < newChildren.length; i++) {
        let newChild = newChildren[i];
        let oldChild = oldChildren[i];

        // 当小于旧节点的length，对比更新
        if (i < oldChildren.length) {
          // 递归更新操作
          update(oldChild,newChild)
        } else {
          // 否则将多出的节点插入操作
          let range = document.createRange()
          range.setStart(tailRange.endContainer,tailRange.endOffset)
          range.setEnd(tailRange.endContainer,tailRange.endOffset)
          newChild[RENDER_TO_DOM](range)

          // 将尾节点range置为上一个节点的range
          tailRange = range
        }
      }
    }
    let vdom = this.vdom
    update(this._vdom,vdom)
    this._vdom = vdom
  }
  /* rerender() {
    let oldRange = this._range

    let range = document.createRange()
    range.setStart(oldRange.startContainer,oldRange.startOffset)
    range.setEnd(oldRange.startContainer,oldRange.startOffset)
    this[RENDER_TO_DOM](range)

    oldRange.setStart(range.endContainer,range.endOffset)
    oldRange.deleteContents()
  } */
  setState(newState) {
    if (this.state === null || typeof this.state !== 'object') {
      this.state = newState
      return;
    }
    let merge = (oldState,newState) => {
      if (oldState === null || typeof oldState !== 'object') {
        oldState = newState
      } else {
        // 将新的state递归遍历赋值给旧的state,深拷贝
        for(let p in newState) {
          if (oldState[p] === null || typeof oldState[p] !== 'object') {
            oldState[p] = newState[p]
          } else {
            merge(oldState[p],newState[p])
          }
        }
      }
    }
    merge(this.state,newState)
    this.update()
    // this.rerender()
  }
  /* get root() {
    if (!this._root) {
      this._root = this.render().root
    }
    return this._root
  } */
}

// 真实dom标签的处理如div
class ElementWrapper extends Component {
  constructor(type) {
    super(type);
    this.type = type
    this.root = document.createElement(type)
  }
  /*setAttribute(name,value) {
    if (name.match(/^on([\s\S]+)$/)) {
      this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/,c => c.toLowerCase()),value)
    } else {
      if (name === 'className') {
        this.root.setAttribute('class',value)
      } else {
        this.root.setAttribute(name,value)
      }
    }
  }
  appendChild(component) {
    let range = document.createRange()
    console.log('rangeElement',range)
    range.setStart(this.root,this.root.childNodes.length)
    range.setEnd(this.root,this.root.childNodes.length)
    component[RENDER_TO_DOM](range)
    // this.root.appendChild(component.root)
  }*/
  get vdom() {
    this.vchildren = this.children.map(child => child.vdom)
    return this
    /* {
      type:this.type,
      props:this.props,
      children:this.children.map(child => child.vdom)
    } */
  }
  [RENDER_TO_DOM](range) {
    this._range = range

    let root = document.createElement(this.type)

    for(let name in this.props) {
      let value = this.props[name]
      if (name.match(/^on([\s\S]+)$/)) {
        root.addEventListener(RegExp.$1.replace(/^[\s\S]/,c => c.toLowerCase()),value)
      } else {
        if (name === 'className') {
          root.setAttribute('class',value)
        } else {
          root.setAttribute(name,value)
        }
      }
    }

    if (!this.vchildren) 
      this.vchildren = this.children.map(child => child.vdom);

    for(let child of this.vchildren) {
      let childRange = document.createRange()
      childRange.setStart(root,root.childNodes.length)
      childRange.setEnd(root,root.childNodes.length)
      child[RENDER_TO_DOM](childRange)
    }
    // range.insertNode(root)

    replaceContent(range,root)
  }
}

// 文本节点的处理
class TextWrapper extends Component {
  constructor(content) {
    super(content);
    this.type = '#text'
    this.content = content
  }
  get vdom() {
    return this
    /* {
      type:'#text',
      content:this.content
    } */
  }
  [RENDER_TO_DOM](range) {
    this._range = range

    // range.deleteContents()
    // range.insertNode(this.root)
    let root = document.createTextNode(this.content)

    replaceContent(range,root)
  }
}

function replaceContent(range, node) {
  range.insertNode(node)
  range.setStartAfter(node)
  range.deleteContents() // 此时的删除是将从node后设置的开始位置处开始往后删除，并不是删除的包括新插入后的全部内容

  range.setStartBefore(node)
  range.setEndAfter(node)
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
      if (child === null) {
        continue;
      }
      if ((typeof child === 'object') && (child instanceof Array)) {
        insertChildren(child);
      }else {
        e.appendChild(child);
      }
    }
  }
  insertChildren(children)
  return e;
}

export function render(component,parentElement) {
  // parentElement.appendChild(component.root)
  let range = document.createRange()
  range.setStart(parentElement,0)
  range.setEnd(parentElement,parentElement.childNodes.length)
  range.deleteContents()
  component[RENDER_TO_DOM](range)
}