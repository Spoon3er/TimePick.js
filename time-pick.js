/**
 * TimePick - A customizable time picker component
 * @version 1.1.0
 * @author Katheeskumar, Spoon3er
 * 
 * @description
 * Creates a time picker from an input element. Supports both single element
 * and multiple element initialization.
 * 
 * @example
 * // 1. Single Element Usage (with ID)
 * const singlePicker = new TimePick('#timeInput');
 * console.log('Single picker:', singlePicker.getValue());
 * 
 * // 2. Multiple Elements Usage (with Class)
 * const multiPicker = new TimePick('.timePicker');
 * console.log('Multi picker:', multiPicker.getAll());
 * 
 * multiPicker.instances.forEach((instance, id) => {
 *   console.log('Picker', id, instance.getValue());
 * });
 * 
 * // 3. Advanced Usage Examples
 * const picker = new TimePick('#timeInput', {step:15});  // 15-minute intervals
 * 
 * // Validation with time ranges
 * picker.onChange(({totalMinutes}) => {
 *    const isValid = totalMinutes >= 360 && totalMinutes <= 1200; // 6:00-20:00
 *    picker.setValid(isValid);
 * });
 * 
 * // Get/Set Time Values
 * const time = picker.getVars();  // { hour: 14, minute: 30, totalMinutes: 870 }
 * picker.setValue(870);           // Sets to 14:30
 * 
 * @style
 * add class theme-dark or theme-light to the input element for dark/light theme
 * 
 * @param {string} element - CSS selector for the input element
 * @param {number} [step=30] - Step interval in minutes (default: 30)
 * 
 * @property {number} hour - Selected hour (0-23)
 * @property {number} minute - Selected minute (0-59)
 * @property {number} totalMinutes - Total minutes since midnight
 * 
 * @method getVars() - Returns {hour, minute, totalMinutes}
 * @method onChange(callback) - Register change event handler
 * @method setValue(totalMinutes) - Set time programmatically
 * @method setValid(isValid) - Set validity state
 */
class TimePick {

    static DEFAULT_OPTIONS = {
        step: 30,
        placeholder: '00:00',
    };

    constructor(selector, options) {
        const { type, value } = this.isInstanceInput(selector);

        if (type === 'class') {
            const elements = document.querySelectorAll(`.${value}`);
            const instances = new Map();

            elements.forEach((el, index) => {
                if (!el.id) el.id = `timePicker_${index}`;
                instances.set(el.id, new TimePick(`#${el.id}`, options));
            });

            return {
                instances,
                on: (event, callback) => {
                    instances.forEach(instance => instance.on(event, callback));
                },
                getAll: () => instances,
                getValue: (id) => instances.get(id)?.getValue(),
                setValue: (id, totalMinutes) => instances.get(id)?.setValue(totalMinutes),
                setValid: (id, isValid) => instances.get(id)?.setValid(isValid)
            };
        }

        this.config = { ...TimePick.DEFAULT_OPTIONS, ...options };
        this.eventHandlers = {
            change: [],
            dismiss: [],
            show: []
        };

        this.hour = 0;
        this.minute = 0;
        this.totalMinutes = 0;
        this.buttonActive = false;
        this.elements = null;
        this.id = this.randomString(5);

        this.elements = document.querySelectorAll(selector);

        // only handle the first matching element
        this.inputElement = this.elements[0];
        this.inputElement.setAttribute("TimePick", "input-" + this.id);
        this.inputElement.insertAdjacentHTML("afterend", this.getButtonHTML(this.id));

        let btn = document.querySelector(`[TimePick="input-${this.id}"] + .TimePick_BTN .TimePick_ICON`);
        if (btn) {
            btn.onclick = (e) => {
                btn.classList.toggle("active");
                let popup = document.getElementById("popup_" + this.id);
                popup.style.display = popup.style.display === "flex" ? "none" : "flex";
                this.addOverlayListener(popup, btn);
                this.handleTimeUpdate();
                this.triggerEvent('show');
            };
        }

        let adjustButtons = document.querySelectorAll(`[TimePick="input-${this.id}"] + .TimePick_BTN .adjustbtn`);
        adjustButtons.forEach(button => {
            button.onclick = () => {
                let data = JSON.parse(button.getAttribute("data"));

                if (data.type == 'hour' && data.action == 'up') {
                    this.hour = (this.hour + 1) % 24;
                    this.handleTimeUpdate();
                }
                if (data.type == 'hour' && data.action == 'down') {
                    this.hour = (this.hour - 1 + 24) % 24;
                    this.handleTimeUpdate();
                }
                if (data.type == 'minute' && data.action == 'up') {
                    this.minute = this.minute + this.config.step;
                    if (this.minute >= 60) {
                        this.minute = 0;
                        this.hour = (this.hour + 1) % 24;
                    }
                    this.handleTimeUpdate();
                }
                if (data.type == 'minute' && data.action == 'down') {
                    this.minute = this.minute - this.config.step;
                    if (this.minute < 0) {
                        this.minute = 60 - this.config.step;
                        this.hour = (this.hour - 1 + 24) % 24;
                    }
                    this.handleTimeUpdate();
                }

            };
        });

        // Initialize from existing value if present
        if (this.inputElement.value) {
            let [hour, minute] = this.inputElement.value.split(":").map(Number);
            this.hour = hour;
            this.minute = minute;
            this.handleTimeUpdate();
        } else {
            this.inputElement.setAttribute("value", this.config.placeholder);
        }
    }

    on(event, callback) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].push(callback);
        }
    }

    triggerEvent(event) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(callback => callback(this));
        }
    }

    addOverlayListener(popup, btn) {
        if (popup.hasAttribute('overlayDissmiss')) return;
        popup.setAttribute('overlayDissmiss', true);

        document.addEventListener('click', (e) => {
            if (!popup?.style.display === "flex") return;
            if (popup.contains(e.target) || btn.id === e.target.id) return;

            popup.style.display = "none";
            btn.classList.remove("active");
            this.triggerEvent('dismiss');
        });
    }

    randomString(length) {
        let result = '';
        let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let charactersLength = characters.length;
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

    getButtonHTML(id) {
        const theme = (this.inputElement.classList.contains("theme-dark")) ? "theme-dark" : (this.inputElement.classList.contains("theme-light")) ? "theme-light" : "";

        return `<button class="TimePick_BTN TimePick_${id} ${theme}">
        <svg class="TimePick_ICON ${theme}" id="${id}" height="20" width="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path class="timepick-icon ${theme}" d="M22 12C22 17.52 17.52 22 12 22C6.48 22 2 17.52 2 12C2 6.48 6.48 2 12 2C17.52 2 22 6.48 22 12Z"  stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path> <path class="timepick-icon ${theme}" d="M15.71 15.18L12.61 13.33C12.07 13.01 11.63 12.24 11.63 11.61V7.51001" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></path></g></svg>
        <div class="TimePick_POPUP ${theme}" id="popup_${id}">
        <div class="hour ${theme}">
        <div class="adjustbtn uparrow ${theme}" data='{"type": "hour", "action": "up"}'><svg class="svg-arrow ${theme}" height="20px" width="20px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/2000/xlink" viewBox="-30.7 -30.7 573.13 573.13" xml:space="preserve"  stroke-width="30"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <path class="timepick-icon ${theme}" d="M508.788,371.087L263.455,125.753c-4.16-4.16-10.88-4.16-15.04,0L2.975,371.087c-4.053,4.267-3.947,10.987,0.213,15.04 c4.16,3.947,10.667,3.947,14.827,0l237.867-237.76l237.76,237.76c4.267,4.053,10.987,3.947,15.04-0.213 C512.734,381.753,512.734,375.247,508.788,371.087z"></path> </g> </g> </g></svg></div>
        <div id="label_hour_${id}" class="label ${theme}">00</div>
        <div class="adjustbtn downarrow ${theme}" data='{"type": "hour", "action": "down"}'><svg class="svg-arrow ${theme}" height="20px" width="20px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/2000/xlink" viewBox="-30.7 -30.7 573.13 573.13" xml:space="preserve"  stroke-width="30" transform="rotate(180)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <path class="timepick-icon ${theme}" d="M508.788,371.087L263.455,125.753c-4.16-4.16-10.88-4.16-15.04,0L2.975,371.087c-4.053,4.267-3.947,10.987,0.213,15.04 c4.16,3.947,10.667,3.947,14.827,0l237.867-237.76l237.76,237.76c4.267,4.053,10.987,3.947,15.04-0.213 C512.734,381.753,512.734,375.247,508.788,371.087z"></path> </g> </g> </g></svg></div>
        </div>
        <div class="minute ${theme}">
        <div class="adjustbtn uparrow ${theme}" data='{"type": "minute", "action": "up"}'><svg class="svg-arrow ${theme}" height="20px" width="20px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/2000/xlink" viewBox="-30.7 -30.7 573.13 573.13" xml:space="preserve"  stroke-width="30"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <path class="timepick-icon ${theme}" d="M508.788,371.087L263.455,125.753c-4.16-4.16-10.88-4.16-15.04,0L2.975,371.087c-4.053,4.267-3.947,10.987,0.213,15.04 c4.16,3.947,10.667,3.947,14.827,0l237.867-237.76l237.76,237.76c4.267,4.053,10.987,3.947,15.04-0.213 C512.734,381.753,512.734,375.247,508.788,371.087z"></path> </g> </g> </g></svg></div>
        <div id="label_minute_${id}" class="label ${theme}">00</div>
        <div class="adjustbtn downarrow ${theme}" data='{"type": "minute", "action": "down"}'><svg class="svg-arrow ${theme}" height="20px" width="20px" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/2000/xlink" viewBox="-30.7 -30.7 573.13 573.13" xml:space="preserve"  stroke-width="30" transform="rotate(180)"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <path class="timepick-icon ${theme}" d="M508.788,371.087L263.455,125.753c-4.16-4.16-10.88-4.16-15.04,0L2.975,371.087c-4.053,4.267-3.947,10.987,0.213,15.04 c4.16,3.947,10.667,3.947,14.827,0l237.867-237.76l237.76,237.76c4.267,4.053,10.987,3.947,15.04-0.213 C512.734,381.753,512.734,375.247,508.788,371.087z"></path> </g> </g> </g></svg></div>
        </div>
        <div class="ampm ${theme}"></div>
        </div>
        </button>`;
    }

    isInstanceInput(selector) {
        if (typeof selector === 'string') {
            return {
                type: selector.startsWith('#') ? 'id' : 'class',
                value: selector.substring(1)
            };
        }
        return { type: 'element', value: selector };
    }

    handleTimeUpdate() {
        let hrview = this.hour.toString().padStart(2, '0');
        let mnview = this.minute.toString().padStart(2, '0');

        document.getElementById('label_hour_' + this.id).innerText = hrview;
        document.getElementById('label_minute_' + this.id).innerText = mnview;
        this.inputElement.value = hrview + ":" + mnview;

        this.totalMinutes = (this.hour * 60) + this.minute;
        this.buttonActive = btn.classList.contains("active");

        this.triggerEvent('change');
    }

    getValue() {
        return {
            hour: this.hour,
            minute: this.minute,
            totalMinutes: this.totalMinutes,
            buttonActive: this.buttonActive,
            instanceId: this.id
        };
    }

    setValue(totalMinutes) {
        this.hour = Math.floor(totalMinutes / 60);
        this.minute = totalMinutes % 60;
        this.handleTimeUpdate();
    }

    setValid(isValid) {
        let button = document.getElementById('adProgramm');

        if (!this.inputElement || !button) return;

        this.inputElement.classList.toggle('invalid', !isValid);
        button.disabled = !isValid;
    }
}
