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
 * const picker = new TimePick('#timeInput', {placeholder: 'Select Time'});  // Custom placeholder
 * 
 * // Validation with time ranges
 * picker.onChange(({totalMinutes}) => {
 *    const isValid = totalMinutes >= 360 && totalMinutes <= 1200; // 6:00-20:00
 *    picker.setValid(isValid);
 * });
 * 
 * // Get/Set Time Values
 * const time = picker.getValue();  // { hour: 14, minute: 30, totalMinutes: 870 }
 * picker.setValue(870);           // Sets to 14:30
 * 
 * @style {CSS} - Add 'theme-dark' or 'theme-light' class to your input element 
 *  for dark/light theme. Leave blank for system prefers-color-scheme.
 * 
 * @param {string} element - CSS selector for the input element
 * @param {number} [step=30] - Step interval in minutes (default: 30)
 * @param {string} [placeholder='00:00'] - Placeholder text for the input
 * 
 * @property {number} hour - Selected hour (0-23)
 * @property {number} minute - Selected minute (0-59)
 * @property {number} totalMinutes - Total minutes since midnight
 * 
 * @method getValue() - Returns {hour, minute, totalMinutes}
 * @method onChange(callback) - Register change event handler
 * @method setValue(totalMinutes) - Set time programmatically
 * @method setValid(isValid) - Set validity state
 */
var TimePick = (function () {

    'use strict';

    const DEFAULT_OPTIONS = {
        step: 30,
        placeholder: '00:00',
        autohide: true,
    };


    var Constructor = function (selector, options) {
        const config = validateOptions(options);


        const { type, value } = isInstanceInput(selector);
        if (type === 'class') {
            const elements = document.querySelectorAll(`.${value}`);
            const instances = new Map();

            elements.forEach((el, index) => {
                if (!el.id) el.id = `timePicker_${index}`;
                instances.set(el.id, new Constructor(`#${el.id}`, config));
            });

            return {
                instances,
                onChange: (callback) => {
                    instances.forEach(instance => instance.onChange(callback));
                },
                getIds: () => Array.from(instances.keys()),
                getValue: (elementId) => instances.get(elementId)?.getValue(),
                setValue: (elementId, totalMinutes) => instances.get(elementId)?.setValue(totalMinutes),
                setValid: (elementId, isValid) => instances.get(elementId)?.setValid(isValid)
            };
        }



        // instance variables for each TimePick instance
        var instance = {
            hour: 0,
            minute: 0,
            totalMinutes: null,
            buttonActive: false,
            elementId: null,
            id: randomString(5)
        };


        let inputElement = document.querySelectorAll(selector)[0];
        inputElement.setAttribute("TimePick", "input-" + instance.id);
        inputElement.insertAdjacentHTML("afterend", getButtonHTML(instance.id));


        let btn = document.querySelector(`[TimePick="input-${instance.id}"] + .TimePick_BTN .TimePick_ICON`);
        if (btn) {
            btn.onclick = (e) => {
                btn.classList.toggle("active");
                let popup = document.getElementById("popup_" + instance.id);
                popup.style.display = popup.style.display === "flex" ? "none" : "flex";
                if (config.autohide) addOverlayListener(popup, btn);
                handleTimeUpdate();
            };
        }


        let adjustButtons = document.querySelectorAll(`[TimePick="input-${instance.id}"] + .TimePick_BTN .adjustbtn`);
        adjustButtons.forEach(button => {
            button.onclick = () => {
                const data = JSON.parse(button.getAttribute("data"));
                if (!data.type || !data.action) return;

                switch (`${data.type}_${data.action}`) {
                    case 'hour_up':
                        instance.hour = (instance.hour + 1) % 24;
                        break;
                    case 'hour_down':
                        instance.hour = (instance.hour - 1 + 24) % 24;
                        break;
                    case 'minute_up':
                        instance.minute = instance.minute + config.step;
                        if (instance.minute >= 60) {
                            instance.minute = 0;
                            instance.hour = (instance.hour + 1) % 24;
                        }
                        break;
                    case 'minute_down':
                        instance.minute = instance.minute - config.step;
                        if (instance.minute < 0) {
                            instance.minute = 60 - config.step;
                            instance.hour = (instance.hour - 1 + 24) % 24;
                        }
                        break;
                }

                handleTimeUpdate();

            };
        });

        // Initialize from existing value if present
        if (inputElement.value) {
            let [hour, minute] = inputElement.value.split(":").map(Number);
            instance.hour = hour;
            instance.minute = minute;
            handleTimeUpdate(true);
        } else {
            inputElement.setAttribute("value", config.placeholder);
        }

        function validateOptions(options = {}) {
            const validatedOptions = { ...DEFAULT_OPTIONS };

            if (options.step) {
                const step = parseInt(options.step);
                if (!isNaN(step) && step >= 1 && step <= 60) {
                    validatedOptions.step = step;
                } else {
                    console.warn(`TimePick: step must be between 1 and 60, using default value (${DEFAULT_OPTIONS.step})`);
                }
            }

            if (typeof options.autohide === 'boolean') {
                validatedOptions.autohide = options.autohide;
            }


            if (typeof options.placeholder === 'string') {
                validatedOptions.placeholder = options.placeholder;
            }

            return validatedOptions;
        };

        // Hide TimePick_POPUP on outside click
        function addOverlayListener(popup, btn) {
            if (popup.hasAttribute('overlayDissmiss')) return;
            popup.setAttribute('overlayDissmiss', true);

            document.addEventListener('click', function (e) {
                if (popup?.style.display !== "flex") return;
                if (popup.contains(e.target) || btn.id === e.target.id) return;

                popup.style.display = "none";
                btn.classList.remove("active");
            });
        }



        function randomString(length) {
            let result = '';
            let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let charactersLength = characters.length;
            for (let i = 0; i < length; i++) {
                result += characters.charAt(Math.floor(Math.random() * charactersLength));
            }
            return result;
        }

        function getTheme(element) {
            if (element.classList.contains("theme-dark")) return "theme-dark";
            if (element.classList.contains("theme-light")) return "theme-light";
            return "";
        }

        function getButtonHTML(id) {
            const theme = getTheme(inputElement);

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


        var instanceCallback = null;

        function isInstanceInput(selector) {
            if (typeof selector === 'string') {
                return {
                    type: selector.startsWith('#') ? 'id' : 'class',
                    value: selector.substring(1)
                };
            }
            return { type: 'element', value: selector };
        }

        function handleTimeUpdate(existingValue = false) {
            let hrview = instance.hour.toString().padStart(2, '0');
            let mnview = instance.minute.toString().padStart(2, '0');

            if (!existingValue) {
                document.getElementById('label_hour_' + instance.id).innerText = hrview;
                document.getElementById('label_minute_' + instance.id).innerText = mnview;
                inputElement.value = hrview + ":" + mnview;
            }

            instance.totalMinutes = (instance.hour * 60) + instance.minute;
            instance.buttonActive = btn.classList.contains("active");
            instance.elementId = inputElement.id;

            // Call callback if set
            if (instanceCallback) {
                instanceCallback({ ...instance });
            }
        }


        var api = {
            onChange: function (callback) {
                instanceCallback = callback;
                return this;
            },
            getValue: function () {
                return instance;
            },
            setValue: function (totalMinutes) {
                instance.hour = Math.floor(totalMinutes / 60);
                instance.minute = totalMinutes % 60;
                handleTimeUpdate();
            },
            setValid: function (isValid, button = false) {

                if (!inputElement) return;

                inputElement.classList.toggle('invalid', !isValid);
                if (button) button.disabled = !isValid;
            },
        };

        return api;

    };

    return Constructor;

})();