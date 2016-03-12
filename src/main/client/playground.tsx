/// <reference path="../../typings/inferno-component.d.ts"/>
/// <reference path="../../typings/inferno-dom.d.ts"/>
/// <reference path="../../typings/inferno-jsx.d.ts"/>

class FocusInput extends InfernoComponent.Component {
  constructor(props: any) {
    super(props);

    this.state = {
      isEditMode: false
    };

    this.blur = this.blur.bind(this);
    this.focus = this.focus.bind(this);
  }

  blur(): void {
    console.log(new Date(), ': BLUR');
    this.setState({
      isEditMode: false
    });
  }

  focus(): void {
    console.log(new Date(), ': FOCUS');
    this.setState({
      isEditMode: true
    });
  }

  change(e: any): void {
    console.log(new Date(), ': CHANGE');
  }

  render(props: any): any {
    return (
      <div>
        <span>{this.state.isEditMode + ''}</span>
        <input
          onBlur={this.blur}
          onFocus={this.focus}
          onChange={this.change}
          value={this.props.value}
          />
      </div>
    );
  }
}

class Looper extends InfernoComponent.Component {
  constructor(props: any) {
    super(props);
  }

  render(): any {
    return (
      <div class="loop">
        {['Volvo', 'BMW', 'Mercedes'].map((car) => {
          return (
            <FocusInput value={car} />
          );
        }) }
      </div>
    );
  }
}

InfernoDOM.render(<Looper />, document.getElementById('app'));
