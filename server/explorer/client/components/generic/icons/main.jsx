import React from 'react'

/*********************************************************************************
 * Purpose: General purpose dialogbox
 *
 * Props
 *     className: pass to the img tag
 *     type     : icon type
 *
 */
export class AppIcon extends React.Component {
    static local_static_root = '/static/images';
    static url_by_type = {
        checkmark: 'checkmark-32.ico',
        dismiss: 'x-mark-32.ico'
    };

    render() {
        const extraOps = {};
        if ("className" in this.props) {
            extraOps.className = this.props.className;
        }

        const url = `${AppIcon.local_static_root}/${AppIcon.url_by_type[this.props.type]}`;
        if (!url) {
            throw Exception(`Invalid icon type: ${this.props.type}`);
        }

        return <img {... extraOps} src={url} />;
    }
}
