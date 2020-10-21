import React from 'react'

import Button from 'react-bootstrap/Button'

import {TimerTable} from './main.jsx'

export class TestTimerTable extends React.Component {

    timers = [
        {
            id: 'a',
            name: 'foo',
            description: 'blah...',
            author: 'stonezhong',
            team: 'trading',
            interval_unit: 'DAY',
            interval_amount: 1,
            start_from: '2020-01-01 00:00:00',
            topic: 'daily-trading',
            context: "{}",
            paused: false,
        },
        {
            id: 'b',
            name: 'bar',
            description: '<p>This is the daily power schedule</p>',
            author: 'stonezhong',
            team: 'trading',
            interval_unit: 'DAY',
            interval_amount: 1,
            start_from: '2020-05-01 00:00:00',
            topic: 'daily-trading',
            context: "{}",
            paused: true,
        },
    ];

    onSave = (mode, timer) => {
        console.log(`onSave is called with mode = ${mode}`);
        console.log(timer);
    };

    render() {
        return (
            <div>
                <TimerTable
                    allowEdit={true}
                    allowNew={true}
                    timers={this.timers}
                    onSave={this.onSave}
                />
            </div>
        );
    }
}
