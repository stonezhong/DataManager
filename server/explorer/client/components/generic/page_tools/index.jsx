import React from 'react'

/*********************************************************************************
 * Purpose: Pahe Header
 *
 *      It has a title and some tools on the same line
 *
 * Props
 *      title   : String, title for the header
 *      children: rest of stuff in the line
 */

export class PageHeader extends React.Component {
    render() {
        return (
            <div>
                <h1 className="c-ib">{this.props.title}</h1>
                <div className="c-vc c-ib">
                    {this.props.children}
                </div>
            </div>
        )
    }
}
