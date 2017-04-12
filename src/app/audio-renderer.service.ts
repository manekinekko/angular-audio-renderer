import {DomElementSchemaRegistry} from '@angular/compiler';
import { APP_ID, Inject, Injectable, NgZone, RenderComponentType, Renderer, Renderer2, RendererFactory2, RendererStyleFlags2, RendererType2, RootRenderer, ViewEncapsulation, InjectionToken } from '@angular/core';
import {DOCUMENT, ɵNAMESPACE_URIS as NAMESPACE_URIS, ɵSharedStylesHost as SharedStylesHost, ɵflattenStyles as flattenStyles, ɵgetDOM as getDOM, ɵshimContentAttribute as shimContentAttribute, ɵshimHostAttribute as shimHostAttribute} from '@angular/platform-browser';
import {ɵAnimationEngine as AnimationEngine} from "@angular/animations/browser";
import {ɵAnimationRendererFactory as AnimationRendererFactory} from "@angular/platform-browser/animations";

import { ModemService } from "app/modem.service";

const EMPTY_ARRAY: any[] = [];

export const MODEM_TRANSMISSION_PERIOD = new InjectionToken<number>('MODEM_TRANSMISSION_PERIOD');
export const MODEM_TRANSMISSION_FREQUENCY = new InjectionToken<number>('MODEM_TRANSMISSION_FREQUENCY');


@Injectable()
export class AudioRendererService implements RendererFactory2 {
  private rendererByCompId = new Map<string, Renderer2>();
  private defaultRenderer: Renderer2;
  private schema = new DomElementSchemaRegistry();

  constructor(
      private ngZone: NgZone, 
      @Inject(DOCUMENT) private document: any,
      private sharedStylesHost: SharedStylesHost,
      private modemService: ModemService,
      @Inject(MODEM_TRANSMISSION_PERIOD) private modemPeriod: number,
      @Inject(MODEM_TRANSMISSION_FREQUENCY) private modemFreq: number,
    ) {

    this.defaultRenderer = new DefaultServerRenderer2(document, ngZone, this.schema, this.modemService, this.modemPeriod, this.modemFreq);

  };

  createRenderer(element: any, type: RendererType2): Renderer2 {
    this.modemService.listen();
    return this.defaultRenderer;
  }
}

class DefaultServerRenderer2 implements Renderer2 {
  data: {[key: string]: any} = Object.create(null);
  destroyNode: null;

  constructor(
    private document: any, 
    private ngZone: NgZone, 
    private schema: DomElementSchemaRegistry,
    private modemService: ModemService,
    @Inject(MODEM_TRANSMISSION_PERIOD) private modemPeriod: number,
    @Inject(MODEM_TRANSMISSION_FREQUENCY) private modemFreq: number,
  ) {}

  destroy(): void {}

  createElement(name: string, namespace?: string, debugInfo?: any): any {
    if (namespace) {
      return getDOM().createElementNS(NAMESPACE_URIS[namespace], name);
    }
    this.modemService.BASK(`<${name}></${name}>`, this.modemPeriod, this.modemFreq);
    return getDOM().createElement(name);
  }

  createComment(value: string, debugInfo?: any): any { return getDOM().createComment(value); }

  createText(value: string, debugInfo?: any): any { return getDOM().createTextNode(value); }

  appendChild(parent: any, newChild: any): void { getDOM().appendChild(parent, newChild); }

  insertBefore(parent: any, newChild: any, refChild: any): void {
    if (parent) {
      getDOM().insertBefore(parent, refChild, newChild);
    }
  }

  removeChild(parent: any, oldChild: any): void {
    if (parent) {
      getDOM().removeChild(parent, oldChild);
    }
  }

  selectRootElement(selectorOrNode: string|any, debugInfo?: any): any {
    let el: any;
    if (typeof selectorOrNode === 'string') {
      el = getDOM().querySelector(this.document, selectorOrNode);
      if (!el) {
        throw new Error(`The selector "${selectorOrNode}" did not match any elements`);
      }
    } else {
      el = selectorOrNode;
    }
    getDOM().clearNodes(el);
    return el;
  }

  parentNode(node: any): any { return getDOM().parentElement(node); }

  nextSibling(node: any): any { return getDOM().nextSibling(node); }

  setAttribute(el: any, name: string, value: string, namespace?: string): void {
    if (namespace) {
      getDOM().setAttributeNS(el, NAMESPACE_URIS[namespace], namespace + ':' + name, value);
    } else {
      getDOM().setAttribute(el, name, value);
    }
  }

  removeAttribute(el: any, name: string, namespace?: string): void {
    if (namespace) {
      getDOM().removeAttributeNS(el, NAMESPACE_URIS[namespace], name);
    } else {
      getDOM().removeAttribute(el, name);
    }
  }

  addClass(el: any, name: string): void { getDOM().addClass(el, name); }

  removeClass(el: any, name: string): void { getDOM().removeClass(el, name); }

  setStyle(el: any, style: string, value: any, flags: RendererStyleFlags2): void {
    getDOM().setStyle(el, style, value);
  }

  removeStyle(el: any, style: string, flags: RendererStyleFlags2): void {
    getDOM().removeStyle(el, style);
  }

  // The value was validated already as a property binding, against the property name.
  // To know this value is safe to use as an attribute, the security context of the
  // attribute with the given name is checked against that security context of the
  // property.
  private _isSafeToReflectProperty(tagName: string, propertyName: string): boolean {
    return this.schema.securityContext(tagName, propertyName, true) ===
        this.schema.securityContext(tagName, propertyName, false);
  }

  setProperty(el: any, name: string, value: any): void {
    checkNoSyntheticProp(name, 'property');
    getDOM().setProperty(el, name, value);
    // Mirror property values for known HTML element properties in the attributes.
    const tagName = (el.tagName as string).toLowerCase();
    if (value != null && (typeof value === 'number' || typeof value == 'string') &&
        this.schema.hasElement(tagName, EMPTY_ARRAY) &&
        this.schema.hasProperty(tagName, name, EMPTY_ARRAY) &&
        this._isSafeToReflectProperty(tagName, name)) {
      this.setAttribute(el, name, value.toString());
    }
  }

  setValue(node: any, value: string): void { getDOM().setText(node, value); }

  listen(
      target: 'document'|'window'|'body'|any, eventName: string,
      callback: (event: any) => boolean): () => void {
    // Note: We are not using the EventsPlugin here as this is not needed
    // to run our tests.
    checkNoSyntheticProp(eventName, 'listener');
    const el =
        typeof target === 'string' ? getDOM().getGlobalEventTarget(this.document, target) : target;
    const outsideHandler = (event: any) => this.ngZone.runGuarded(() => callback(event));
    return this.ngZone.runOutsideAngular(() => getDOM().onAndCancel(el, eventName, outsideHandler));
  }
}

const AT_CHARCODE = '@'.charCodeAt(0);
function checkNoSyntheticProp(name: string, nameKind: string) {
  if (name.charCodeAt(0) === AT_CHARCODE) {
    throw new Error(
        `Found the synthetic ${nameKind} ${name}. Please include either "BrowserAnimationsModule" or "NoopAnimationsModule" in your application.`);
  }
}

export function createAnimationRendererFactory(renderer: RendererFactory2, engine: AnimationEngine, zone: NgZone) {
  return new AnimationRendererFactory(renderer, engine, zone);
}

export function createModemFactory() {
  // browser WebAudio implementation
  return new ModemService(new (window as any).AudioContext());
}

export const AUDIO_RENDERER_PROVIDERS = [
  {
    provide: MODEM_TRANSMISSION_PERIOD,
    useValue: 50
  },
  {
    provide: MODEM_TRANSMISSION_FREQUENCY,
    useValue: 800
  },
  {
    provide: ModemService,
    useFactory: createModemFactory
  },
  AudioRendererService,
  AnimationEngine,
  {
    provide: RendererFactory2,
    useFactory: createAnimationRendererFactory,
    deps: [AudioRendererService, AnimationEngine, NgZone, MODEM_TRANSMISSION_PERIOD, MODEM_TRANSMISSION_FREQUENCY]
  },
];