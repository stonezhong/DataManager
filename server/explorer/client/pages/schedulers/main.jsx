import React from 'react'
import ReactDOM from 'react-dom'

import Container from 'react-bootstrap/Container'

import {TimerTable} from '/components/business/timer/main.jsx'

import $ from 'jquery'
const buildUrl = require('build-url');

import {get_csrf_token, get_current_user} from '/common_lib'

class SchedulersPage extends React.Component {
    state = {
        timers: [],
    }

    onSave = (mode, timer) => {
        if (mode === "new") {
            const to_post = {
                name            : timer.name,
                description     : timer.description,
                team            : timer.team,
                paused          : timer.paused,
                interval_unit   : timer.interval_unit,
                interval_amount : timer.interval_amount,
                start_from      : timer.start_from,
                topic           : timer.topic,
                context         : timer.context,
                category        : timer.category,
                end_at          : timer.end_at,
            }

            return fetch('/api/Timers/', {
                method: 'post',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_post)
            }).then((res) => res.json())
        } else if (mode === "edit") {
            const to_patch = {
                description     : timer.description,
                team            : timer.team,
                paused          : timer.paused,
                interval_unit   : timer.interval_unit,
                interval_amount : timer.interval_amount,
                start_from      : timer.start_from,
                end_at          : timer.end_at,
                topic           : timer.topic,
                context         : timer.context,
                category        : timer.category,
            }

            return fetch(`/api/Timers/${timer.id}/`, {
                method: 'patch',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': get_csrf_token(),
                },
                body: JSON.stringify(to_patch)
            }).then((res) => res.json())
        }
    };

    get_page = (offset, limit, filter={}) => {
        const buildArgs = {
            path: "/api/Timers/",
            queryParams: {
                offset: offset,
                limit : limit,
                topic: 'pipeline',
            }
        };
        const url = buildUrl('', buildArgs);
        return fetch(url).then(res => res.json());

    };

    render() {
        return (
            <Container fluid>
                <TimerTable
                    allowEdit={!!this.props.current_user}
                    allowNew={!!this.props.current_user}
                    onSave={this.onSave}
                    get_page={this.get_page}
                    page_size={15}
                    size="sm"
                />
            </Container>
        )
    }
}

$(function() {
    const current_user = get_current_user()
    ReactDOM.render(
        <SchedulersPage current_user={current_user} />,
        document.getElementById('app')
    );
});
